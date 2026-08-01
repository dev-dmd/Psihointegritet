# Arhitektonske Granice, Dizajn Patterni i Backend Standardi (2026)

Ovaj dokument definiše stroge arhitektonske granice, kodne standarde i infrastrukturne zahteve za Python FastAPI SaaS platformu. Sve komponente sistema moraju se striktno pridržavati ovih pravila kako bi se obezbedila maksimalna brzina, tipizacija, izolacija podataka (Multi-tenancy) i skalabilnost AI agenata.

---

## 1. Sistemski Zahtevi & Tehnološki Stak
*   **Runtime:** Python 3.12+ (korišćenje naprednih tipova, `Generic` sintakse i `asyncio` optimizacija).
*   **Okvir (Framework):** FastAPI 0.115+ (potpuno asinhroni pipeline, životni vek aplikacije kroz `lifespan`).
*   **Baza Podataka & ORM:** PostgreSQL 16+ sa `pgvector` ekstenzijom + SQLAlchemy 2.0 (Strogi Async drajver `asyncpg`).
*   **Multi-tenancy:** Izolacija zakupaca na nivou baze podataka pomoću **PostgreSQL Row-Level Security (RLS)** kontrolisanog preko tokenizovanog sesijskog konteksta na serveru.
*   **Keš & Lock:** Redis 7.4+ (asinhroni klijent `redis.asyncio`) za distribuirane lock-ove i visoke performanse Compass Discovery pretrage.
*   **AI Sloj:** Čist custom razvoj i orkestracija agenata direktno preko zvaničnih `openai` i `anthropic` asinhronih SDK klijenata.

---

## 2. Arhitektura Modularnog Monolita (Domain-Driven Design)

Kod je grupisan prema biznis domenima (**Bounded Contexts**). Strogo je zabranjeno deljenje sirovih modela i kružno uvoženje (circular imports) između domena. Komunikacija između domena se obavlja isključivo preko servisnih interfejsa.

```text
app/
│
├── core/                         # Globalna konfiguracija i infrastrukturna srž
│   ├── config.py                 # Pydantic v2 Settings (Envs, Tajne, Klijenti)
│   ├── database.py               # SQLAlchemy Async Engine, RLS Session & Base Model
│   ├── redis.py                  # Inicijalizacija i klijent za Redis / Redis-Cache
│   └── security.py               # Tokenizacija, JWT validacija i enkripcija
│
├── domains/                      # Izolovani biznis domeni
│   ├── cms/                      # CMS Engine: Stranice, layout-i, sekcije
│   ├── crm/                      # CRM Engine: Kontakti, lead-ovi, pipeline-i
│   ├── booking/                  # Booking Engine: Slotovi, kalendar, lock-ovi
│   │   ├── api/                  # HTTP Transportni sloj za Booking
│   │   │   └── v1.py             # Endpoints (Čiste rute, bez teške logike)
│   │   ├── models.py             # SQLAlchemy 2.0 tabele sa RLS konfiguracijom
│   │   ├── schemas.py            # Pydantic v2 ulazno/izlazne validacione šeme
│   │   └── services.py           # Čista poslovna logika i DB mutacije
│   │
│   ├── compass/                  # Compass Platforma: Search, Discovery & Vector DB
│   │   └── vector_service.py     # pgvector operacije i semantičko pretraživanje
│   │
│   ├── diagnostics/              # Diagnostic Engine: Integritet kompleksnih procesa
│   │   └── integrity.py          # Read-only sistemski proveravači anomalija
│   │
│   └── ai_engine/                # AI Orchestrator & Custom Agenti
│       ├── agents/               # Custom LLM agenti (Layout, Marketing, Email)
│       └── orchestrator.py       # Asinhrona State-Machine za koordinaciju agenata
│
└── main.py                       # Ulazna tačka, Lifespan registracija, Globalni Middleware
```

---

## 3. Tipizacija i Validacija Podataka

### 3.1 Stroga Tipizacija (Zero Any)
*   Upotreba `Any` je najstrože zabranjena. Tamo gde je struktura nepoznata, obavezno koristiti `object` ili `Unknown` uz eksplicitne tipovne provere (`isinstance`).
*   Sve funkcije i asinhroni generatori moraju imati kompletne anotacije tipova (Type Hints) za parametre i povratne vrednosti. Obavezno je izvršavanje `mypy --strict app/`.

### 3.2 Pydantic v2 i Separacija Šema
*   Nikada nemojte vraćati sirove SQLAlchemy modele klijentu. Svaka ruta mora imati eksplicitno definisan parametar `response_model` u dekoratoru rute.
*   Šeme moraju biti striktno podeljene na ulazne podatke klijenta (`UserCreate`), parcijalne izmene (`UserUpdate`) i očišćene odgovore za klijenta (`UserResponse`).

```python
# app/domains/booking/schemas.py
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

class BookingSlotCreate(BaseModel):
    """Šema za validaciju dolaznog payload-a sa frontenda."""
    start_time: datetime
    end_time: datetime
    service_id: UUID

class BookingSlotResponse(BaseModel):
    """Šema koja garantuje bezbedan izlaz podataka bez curenja meta-podataka baze."""
    id: UUID
    tenant_id: UUID
    start_time: datetime
    end_time: datetime
    is_booked: bool

    model_config = ConfigDict(from_attributes=True)
```

---

## 4. Multi-tenancy preko Row-Level Security (RLS)

Bezbednost podataka je implementirana direktno u bazi podataka putem PostgreSQL RLS-a. Server upravlja sesijskim kontekstom tako što prilikom svake konekcije upisuje `tenant_id` u lokalnu konfiguraciju sesije (`app.current_tenant_id`).

### 4.1 Globalna Inicijalizacija i RLS Kontekst (`app/core/database.py`)
```python
from collections.abc import AsyncGenerator
from uuid import UUID
from contextvars import ContextVar
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# ContextVar čuva tenant_id bezbedno unutar asinhronog izvršnog thread-a
tenant_context: ContextVar[UUID | None] = ContextVar("tenant_context", default=None)

async_engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=25,
    max_overflow=15,
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

class Base(DeclarativeBase):
    pass

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency Injection provajder koji kreira bazu, izvlači tenant_id 
    iz konteksta i zaključava sesiju unutar PostgreSQL RLS granica.
    """
    current_tenant = tenant_context.get()
    if not current_tenant:
        raise RuntimeError("Pokušaj pristupa bazi bez setovanog Tenant konteksta u bezbednosnom sloju servera.")

    async with AsyncSessionLocal() as session:
        try:
            # Postavljanje sesijske promenljive koju PostgreSQL RLS pravilo čita
            await session.execute(
                text("SET LOCAL app.current_tenant_id = :tenant_id;"),
                {"tenant_id": str(current_tenant)}
            )
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

### 4.2 Primer Mapiranja i SQL RLS Migracione Definicije (`app/domains/booking/models.py`)
Svaka tabela koja pripada tenant-u mora imati sledeću strukturu i SQL definiciju u migracijama:

```python
from uuid import UUID
from datetime import datetime
from sqlalchemy import ForeignKey, String, Boolean, DateTime, text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class BookingSlot(Base):
    __tablename__ = "booking_slots"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    tenant_id: Mapped[UUID] = mapped_column(nullable=False, index=True) # Koristi se u RLS proveri baze
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_booked: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

"""
DODATAK ZA SQL MIGRACIJU (Alembic):
Ovaj SQL kod mora biti uključen u migracione skripte za aktivaciju RLS-a:

ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON booking_slots
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
"""
```

---

## 5. Compass Platforma: pgvector i Semantička Pretraga

Pretraga i preporuka unutar Compass Discovery platforme vrši se nad istom bazom koristeći vektorske embeddinge dužine 1536 dimenzija (OpenAI standard) ili 1024 dimenzije (Anthropic standard).

```python
# app/domains/compass/vector_service.py
from uuid import UUID
from pgvector.sqlalchemy import Vector
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import Base
from sqlalchemy.orm import Mapped, mapped_column

class ContentEmbedding(Base):
    __tablename__ = "content_embeddings"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    tenant_id: Mapped[UUID] = mapped_column(nullable=False)
    content_text: Mapped[str] = mapped_column(String, nullable=False)
    # pgvector kolona sa fiksnim brojem dimenzija za visoke performanse pretrage
    embedding: Mapped[list[float]] = mapped_column(Vector(1536), nullable=False)

class CompassSearchService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def semantic_search(self, query_embedding: list[float], limit: int = 10) -> list[ContentEmbedding]:
        """
        Pronalaženje najbližih stavki CMS-a koristeći kosinusnu udaljenost (<=>).
        RLS automatski filtrira rezultate za trenutnog tenant-a pre računanja udaljenosti.
        """
        stmt = (
            select(ContentEmbedding)
            .order_by(ContentEmbedding.embedding.cosine_distance(query_embedding))
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
```

---

## 6. Asinhroni Klijenti, Redis i Distribuirani Lock
```app/domains/booking/services.pyfrom contextlib import asynccontextmanagerfrom redis.asyncio import Redisfrom sqlalchemy.ext.asyncio import AsyncSessionfrom app.domains.booking.schemas import BookingSlotCreatefrom app.domains.booking.models import BookingSlotclass ConflictingBookingException(Exception): passclass StrictBookingCoordinator:def init(self, db: AsyncSession, redis: Redis):self.db = dbself.redis = redisasync def secure_booking_slot(self, slot_id: str, payload: BookingSlotCreate) -> BookingSlot:lock_key = f"lock:booking_slot:{slot_id}"# Pokušaj akvizicije lock-a sa Time-To-Live (TTL) od 5 sekundi# Time-out sprečava trajno zaključavanje resursa u slučaju pada sistemaasync with self._redis_lock(lock_key, acquire_timeout=3.0, lock_ttl=5.0) as acquired:if not acquired:raise ConflictingBookingException("Termin je trenutno blokiran od strane drugog korisnika. Pokušajte ponovo.")# Izvršavanje upisa i rezervacije u bazi pošto je lock osiguran# Ovdje dolazi čista SQLAlchemy 2.0 logika...pass@asynccontextmanagerasync def _redis_lock(self, key: str, acquire_timeout: float, lock_ttl: float):import asyncioimport uuidtoken = str(uuid.uuid4())end = asyncio.get_event_loop().time() + acquire_timeoutacquired = Falsewhile asyncio.get_event_loop().time() < end:if await self.redis.set(key, token, ex=int(lock_ttl), nx=True):acquired = Truebreakawait asyncio.sleep(0.1)try:yield acquiredfinally:if acquired:# Oslobađanje lock-a samo ako smo mi vlasnici tokena (Lua script ekvivalent)current_val = await self.redis.get(key)if current_val == token:await self.redis.delete(key)```

7. Custom AI Agent Orchestrator & State Machine
```app/domains/ai_engine/orchestrator.pyfrom openai import AsyncOpenAIfrom anthropic import AsyncAnthropicfrom sqlalchemy.ext.asyncio import AsyncSessionclass CustomAgentOrchestrator:def init(self, db: AsyncSession, openai_client: AsyncOpenAI, anthropic_client: AsyncAnthropic):self.db = dbself.openai = openai_clientself.anthropic = anthropic_clientasync def run_marketing_workflow(self, campaign_id: str, prompt_data: str) -> dict[str, object]:"""Orkestracija u više koraka. Korak 1 poziva Anthropic za duboku kreativnu strategiju,zatim Korak 2 koristi OpenAI za optimizaciju rasporeda elemenata (Layout rendering)."""# Korak 1: Strategija i kreiranje teksta kampanje (Claude-3-5-Sonnet)claude_response = await self.anthropic.messages.create(model="claude-3-5-sonnet-20241022",max_tokens=2000,messages=[{"role": "user", "content": f"Kreiraj strategiju za kampanju: {prompt_data}"}])strategy_text = claude_response.content[0].text# Korak 2: Strukturiranje Layout-a u strogi JSON (OpenAI GPT-4o sa Structured Outputs)gpt_response = await self.openai.chat.completions.create(model="gpt-4o",response_format={"type": "json_object"},messages=[{"role": "system", "content": "Transformiši tekst strategije u čist struktuirani JSON za marketing layout."},{"role": "user", "content": strategy_text}])layout_json = gpt_response.choices[0].message.content# Korak 3: Spuštanje stanja u bazu (RLS automatski vezuje za trenutnog tenant-a)# Slanje rezultata email engine-u...return {"status": "success", "layout": layout_json}```

8. Diagnostic Engine (Sistemski Čuvari Integriteta)Rizični tokovi posla (npr. Intake Matching koji spaja klijenta iz CRM-a sa Booking slotom i menja stanja u 3 različita domena) moraju proći Diagnostic Check.Čekovi su striktno read-only: oni analiziraju podatke i u slučaju devijacije predlažu popravku kao tekstualni log. Nikada sami ne menjaju podatke.Neuspeh izvršavanja provere mora završiti sa status: "failed" (Zabranjeno je prijaviti 0 anomalija ako provera zapravo nije mogla da se izvrši).9. Pipeline Verifikacije i CI/CD PravilaZadatak se smatra završenim, a kod spremnim za integraciju, tek kada sledeće komande prođu sa tačno nula grešaka i nula upozorenja:```bash1. Provera tipizacije i usklađenosti interfejsa domenamypy app/ --strict2. Ultra-brzi linting i automatsko formatiranje kodaruff check app/ --fixruff format app/3. Pokretanje kompletne testne pokrivenosti (Async integracioni testovi)pytest --cov=app --cov-report=term-missing tests/```

# Implementacija Globalnog Multi-Tenant Middleware-a (RLS Enforcer)

Ovaj dokument definiše i implementira globalni middleware sloj za FastAPI koji obezbeđuje asinhronu izolaciju zakupaca (Multi-tenancy) na nivou svakog HTTP zahteva.

---

## 1. Sigurnosni Kontekst i Dekodiranje Tokena (`app/core/security.py`)

Pre nego što middleware presretne zahtev, moramo imati robusnu i brzu metodu za proveru validnosti JWT tokena i ekstrakciju `tenant_id`-ja bez ijednog upita ka bazi podataka (Stateless Tokenization).

```python
import jwt
from uuid import UUID
from datetime import datetime, timezone
from fastapi import HTTPException, status
from pydantic import BaseModel
from app.core.config import settings

class TokenPayload(BaseModel):
    """Struktura podataka unutar kriptografski potpisanog JWT tokena."""
    sub: str          # User ID
    tenant_id: UUID   # Stroga izolacija na nivou baze podataka
    exp: int          # Expiration timestamp

def verify_and_extract_tenant(token: str) -> UUID:
    """
    Dekodira JWT token koristeći simetrični HS256 algoritam i tajni ključ servera.
    U slučaju isteka tokena ili manipulacije, odmah podiže HTTP 401 Unauthorized.
    """
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        
        # Provera isteka vremena na serveru (Time-safe check)
        if datetime.fromtimestamp(token_data.exp, tz=timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token je istekao. Ponovite autentifikaciju.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return token_data.tenant_id

    except (jwt.PyJWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kredencijali nisu validni ili je token korumpiran.",
            headers={"WWW-Authenticate": "Bearer"},
        )
```

---

## 2. Implementacija Globalnog RLS Middleware-a (`app/core/middleware.py`)

Koristimo FastAPI `BaseHTTPMiddleware` strukturu. Ovaj middleware se izvršava pre svake rute, čisti `ContextVar` nakon što se zahtev završi i obezbeđuje da nijedna operacija nad bazom ne može "procureti" u tuđi tenant.

```python
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.database import tenant_context
from app.core.security import verify_and_extract_tenant

class TenantRLSMiddleware(BaseHTTPMiddleware):
    """
    Globalni čuvar RLS kapije. Presreće HTTP zahteve, čita 'Authorization' header,
    puni ContextVar nit i garantuje izolaciju podataka na nivou niti izvršavanja.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        # 1. Izuzeci za javne rute (npr. Swagger dokumentacija, Login, Health Check)
        public_paths = ["/docs", "/redoc", "/openapi.json", "/api/v1/auth/login", "/health"]
        if request.url.path in public_paths:
            return await call_next(request)

        # 2. Ekstrakcija Bearer Tokena iz HTTP zaglavlja
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Nedostaje validan Authorization Bearer token."}
            )

        token = auth_header.split(" ")[1]

        # 3. Kriptografska validacija tokena i ekstrakcija Tenant ID-ja
        try:
            tenant_id = verify_and_extract_tenant(token)
        except Exception as e:
            # Ako validacija baci HTTP eksces, middleware ga hvata i vraća čist JSON klijentu
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Autentifikacija neuspešna. Pristup odbijen."}
            )

        # 4. KLJUČNI KORAK: Postavljanje tenant_id u ContextVar za trenutnu asinhronu nit
        # Svaki kasniji poziv ka get_db_session() će automatski pročitati ovaj ID
        token_context = tenant_context.set(tenant_id)

        try:
            # Nastavak izvršavanja lanca ka FastAPI ruti i servisnom sloju
            response = await call_next(request)
            return response
        finally:
            # Čišćenje konteksta nakon što se zahtev završi (Sprečava memory leak i zagađenje niti)
            tenant_context.reset(token_context)
```

---

## 3. Registracija Middleware-a u Glavnoj Aplikaciji (`app/main.py`)

Middleware se mora registrovati na samom vrhu FastAPI inicijalizacije kako bi bio postavljen iznad rutera poslovne logike.

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.middleware import TenantRLSMiddleware
from app.domains.booking.api.v1 import router as booking_router
from app.domains.cms.api.v1 import router as cms_router

def create_application() -> FastAPI:
    """Konstruktor FastAPI aplikacije (Application Factory Pattern)."""
    app = FastAPI(
        title="SaaS Core Platform Engine",
        version="2026.1.0",
        docs_url=settings.DOCS_URL,    # Kontrolisano preko envs (disable u prod)
        redoc_url=settings.REDOC_URL,
    )

    # 1. Registracija CORS Middleware-a (Infrastrukturni nivo)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 2. Registracija našeg Custom Multi-Tenant RLS čuvara
    # Svi zahtevi ispod ove linije automatski prolaze kroz RLS verifikaciju
    app.add_middleware(TenantRLSMiddleware)

    # 3. Registracija modularnih biznis domena (Rutera)
    app.include_router(booking_router, prefix="/api/v1/booking", tags=["Booking Engine"])
    app.include_router(cms_router, prefix="/api/v1/cms", tags=["CMS Engine"])

    return app

app = create_application()
```

---

## 🛡️ Rezultat u praksi i bezbednost

Kada senior inženjer napiše običan SQL upit unutar bilo kog servisa:
```python
# Unutar bilo kog servisa, niko ne mora ručno da dodaje ".where(tenant_id == current_tenant)"
stmt = select(BookingSlot)
result = await db.execute(stmt)
```
Middleware je već osigurao da je na tekućoj PostgreSQL konekciji izvršena komanda `SET LOCAL app.current_tenant_id = 'uuid';`. Baza podataka će **samostalno izbaciti sve redove koji ne pripadaju tom klijentu**, čak i ako programer potpuno zaboravi da filtrira podatke u Python-u.

# Implementacija Automatizovanog PostgreSQL RLS-a kroz Alembic

Ovaj dokument definiše arhitektonsko rešenje za automatsko generisanje i upravljanje PostgreSQL Row-Level Security (RLS) polisama direktno kroz **Alembic** migracioni pipeline. 

---

## 1. Prilagođavanje Alembic Okruženja (`migrations/env.py`)

Da bismo automatizovali proces i izbegli ručno kucanje SQL-a za svaku novu tabelu, modifikujemo standardni `migrations/env.py` fajl. Alembic će tokom inspekcije modela automatski prepoznati tabele koje zahtevaju izolaciju i nad njima izvršiti RLS komande unutar migracione transakcije.

Zamenite ili proširite `run_migrations_online` funkciju u vašem `migrations/env.py` fajlu sledećim kodom:

```python
import asyncio
from logging.config import fileConfig
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context

# Ovo je vaša SQLAlchemy Base klasa iz app/core/database.py
from app.core.database import Base
from app.core.config import settings

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations(connection):
    """
    Izvršava migracije unutar sinhrone konekcije, 
    proširujući DDL operacije sa automatskim RLS polisama.
    """
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        # Omogućava prepoznavanje tipova i kolona na naprednom nivou
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()
        
        # AUTOMATIZACIJA: Nakon što Alembic izvrši standardne migracije,
        # prolazimo kroz sve detektovane tabele u meta-podacima aplikacije.
        for table_name, table_object in target_metadata.tables.items():
            # Ako tabela ima kolonu 'tenant_id', ona se kvalifikuje za automatski RLS
            if "tenant_id" in table_object.columns:
                # 1. Omogućavanje Row-Level Security-ja nad tabelom
                connection.execute(
                    text(f"ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;")
                )
                
                # 2. Kreiranje polise koja presreće sve operacije (SELECT, INSERT, UPDATE, DELETE)
                # Polisa proverava da li se tenant_id poklapa sa sesijskom promenljivom servera
                policy_name = f"tenant_isolation_policy_on_{table_name}"
                
                # Preventivno brisanje stare polise ako postoji (idempotentnost)
                connection.execute(
                    text(f"DROP POLICY IF EXISTS {policy_name} ON {table_name};")
                )
                
                # Kreiranje nove, striktne polise
                sql_policy = f"""
                CREATE POLICY {policy_name} ON {table_name}
                FOR ALL
                USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
                WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
                """
                connection.execute(text(sql_policy))

async def run_migrations_online() -> None:
    """Pokretanje migracija u asinhronom režimu rada."""
    connectable = create_async_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(run_migrations)

    await connectable.dispose()

if context.is_offline_mode():
    # Naša SaaS platforma striktno zabranjuje offline migracije zbog kompleksnosti i bezbednosti RLS-a
    raise RuntimeError("Offline migracije nisu dozvoljene za ovaj multi-tenant sistem.")
else:
    asyncio.run(run_migrations_online())
```

---

## 2. Definisanje Apstraktnog Multi-Tenant Modela (`app/core/database.py`)

Kako bi programeri imali što manje ručnog posla i kako bismo garantovali postojanje `tenant_id` kolone na svakom SaaS modulu (CMS, CRM, Booking...), kreiramo apstraktnu klasu `TenantBaseModel` koju će svi ostali modeli nasleđivati.

```python
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase

class Base(DeclarativeBase):
    """Zajednička koren koren klasa za sve modele u aplikaciji."""
    pass

class TenantBaseModel(Base):
    """
    Apstraktna klasa koja automatski ubacuje 'tenant_id' i aktivira RLS kroz env.py.
    Sve tabele koje moraju biti izolovane po klijentu nasleđuju OVU klasu.
    """
    __abstract__ = True

    # tenant_id je indeksiran jer će PostgreSQL vršiti RLS provere pri svakom indeksnom skeniranju
    tenant_id: Mapped[UUID] = mapped_column(
        nullable=False, 
        index=True,
        server_default=text("NULLIF(current_setting('app.current_tenant_id', true), '')::uuid")
    )
```

---

## 3. Primer Kreiranja Novog Modela u Praksi (`app/domains/crm/models.py`)

Zahvaljujući gornjoj arhitekturi, kada senior programer kreira novu tabelu za CRM sistem (npr. `Lead`), proces je maksimalno pojednostavljen:

```python
from uuid import UUID
from sqlalchemy import String, text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import TenantBaseModel

class Lead(TenantBaseModel):
    """
    Tabela za upravljanje CRM potencijalnim klijentima.
    Automatski dobija tenant_id kolonu i RLS polisu zahvaljujući TenantBaseModel-u.
    """
    __tablename__ = "crm_leads"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[str] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="NEW", server_default="NEW")
```

---

## 4. Generisanje i Izvršavanje Migracije

Kada pokrenete standardnu Alembic komandu za generisanje migracije:

```bash
alembic revision --autogenerate -m "create_crm_leads_table"
```

Alembic će u svom migracionom fajlu generisati čist, standardni Python kod za kreiranje tabele:

```python
# Delat generisanog koda unutar migrations/versions/xxxx_create_crm_leads_table.py
def upgrade() -> None:
    op.create_table(
        'crm_leads',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('company', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='NEW', nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_crm_leads_tenant_id'), 'crm_leads', ['tenant_id'], unique=False)
```

Međutim, onog trenutka kada pokrenete izvršavanje migracije na bazi podataka:

```bash
alembic upgrade head
```

Naš prilagođeni `env.py` će presresti kraj transakcije i automatski izvršiti u bazi:
1. `ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;`
2. `CREATE POLICY tenant_isolation_policy_on_crm_leads ON crm_leads ...`

---

## ⚠️ Izuzetak: Tabele sa Zajedničkim Podacima (Global Tables)

Ukoliko unutar SaaS platforme imate tabele koje su **zajedničke za sve klijente** (npr. globalni šablon sistema, spisak država, ili sistemski logovi), te tabele **ne smeju** nasleđivati `TenantBaseModel`. One umesto toga nasleđuju čistu `Base` klasu i nad njima Alembic neće aktivirati RLS, čineći ih globalno čitljivim za sve niti.


