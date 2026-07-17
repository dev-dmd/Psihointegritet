import { Eyebrow } from "@/components/ui/eyebrow";

export function TeamIntroSection() {
  return (
    <section id="tim" className="scroll-mt-24 pt-[120px] md:pt-44">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <div className="max-w-[680px]">
          <Eyebrow className="mb-4">Naš tim</Eyebrow>
          <h1 className="text-forest mb-[18px] font-serif text-[clamp(30px,8.5vw,40px)] leading-[1.06] font-normal tracking-[-0.015em] text-pretty md:text-[52px]">
            Ljudi s kojima ćete raditi.
          </h1>
          <p className="text-coffee/72 text-[16.5px] leading-[1.65]">
            Psihointegritet čine stručnjaci sa različitim iskustvima i
            pristupima, ujedinjeni istim principima geštalt psihoterapije —
            poverljivost, prisutnost i poštovanje vašeg tempa. Pogledajte
            pristup i oblasti rada svakog terapeuta i izaberite osobu koja vam
            uliva poverenje.
          </p>
        </div>
      </div>
    </section>
  );
}
