/* @ds-bundle: {"format":3,"namespace":"MarysollDesignSystem_ebb5f9","components":[],"sourceHashes":{"design_handoff_marysoll/ui_kits/app/AIAgentDock.jsx":"fc9f25d7f4ee","design_handoff_marysoll/ui_kits/app/AppShell.jsx":"b2800a5c26a6","design_handoff_marysoll/ui_kits/app/AppointmentsList.jsx":"b915ba898fdd","design_handoff_marysoll/ui_kits/app/CalendarBlock.jsx":"37583bce233c","design_handoff_marysoll/ui_kits/app/LoginCard.jsx":"ff633ceaeb10","design_handoff_marysoll/ui_kits/landing/AIDrawer.jsx":"9c74ccba8b40","design_handoff_marysoll/ui_kits/landing/AIPrompt.jsx":"cb5e53f4c7a8","design_handoff_marysoll/ui_kits/landing/BookingWidget.jsx":"4cbfdc986e5c","design_handoff_marysoll/ui_kits/landing/Header.jsx":"5145984c410d","design_handoff_marysoll/ui_kits/landing/Hero.jsx":"643483d61de9","design_handoff_marysoll/ui_kits/landing/QuickAccess.jsx":"f2fef9fd5c84","design_handoff_marysoll/ui_kits/landing/StickyOffer.jsx":"2341e95f8bfb","design_handoff_marysoll/ui_kits/landing/TrustRow.jsx":"6deabad30814","design_handoff_marysoll/ui_kits/shared/Icons.jsx":"6f9f0acb5e6b","ui_kits/app/AIAgentDock.jsx":"fc9f25d7f4ee","ui_kits/app/AppShell.jsx":"b2800a5c26a6","ui_kits/app/AppointmentsList.jsx":"b915ba898fdd","ui_kits/app/CalendarBlock.jsx":"37583bce233c","ui_kits/app/LoginCard.jsx":"ff633ceaeb10","ui_kits/landing/AIDrawer.jsx":"9c74ccba8b40","ui_kits/landing/AIPrompt.jsx":"cb5e53f4c7a8","ui_kits/landing/BookingWidget.jsx":"4cbfdc986e5c","ui_kits/landing/Header.jsx":"5145984c410d","ui_kits/landing/Hero.jsx":"643483d61de9","ui_kits/landing/QuickAccess.jsx":"f2fef9fd5c84","ui_kits/landing/StickyOffer.jsx":"2341e95f8bfb","ui_kits/landing/TrustRow.jsx":"6deabad30814","ui_kits/listing/BookingFlow.jsx":"3e8f7cad8046","ui_kits/listing/CityHeader.jsx":"1fb6b68984be","ui_kits/listing/FilterBar.jsx":"5be460047ea0","ui_kits/listing/ListingHero.jsx":"a88756aef7bf","ui_kits/listing/SlotCard.jsx":"18e8657536cc","ui_kits/shared/Icons.jsx":"6f9f0acb5e6b","ui_kits/shared/MIcons.jsx":"ef7715c6b40a"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.MarysollDesignSystem_ebb5f9 = window.MarysollDesignSystem_ebb5f9 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// design_handoff_marysoll/ui_kits/app/AIAgentDock.jsx
try { (() => {
function AIAgentDock({
  onSubmit,
  isLoading,
  thread
}) {
  const [input, setInput] = React.useState('');
  const send = () => {
    if (!input.trim()) return;
    onSubmit(input.trim());
    setInput('');
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "ai-dock"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ai-dock-inner"
  }, /*#__PURE__*/React.createElement("p", {
    className: "ai-dock-tag"
  }, isLoading ? 'Ažuriram predloge komponenti…' : 'Boost your experience. Marysoll Assistant AI.'), /*#__PURE__*/React.createElement("div", {
    className: "ai-dock-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ai-dock-bolt",
    "aria-label": "Statistika"
  }, /*#__PURE__*/React.createElement(Icon.Bolt, {
    width: "18",
    height: "18"
  })), /*#__PURE__*/React.createElement("textarea", {
    rows: 1,
    placeholder: "Pitaj Mariju\u2026",
    value: input,
    onChange: e => setInput(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-secondary ms-btn-md",
    onClick: send,
    disabled: isLoading || !input.trim()
  }, isLoading ? 'Slanje…' : 'Pošalji'))));
}
window.AIAgentDock = AIAgentDock;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_marysoll/ui_kits/app/AIAgentDock.jsx", error: String((e && e.message) || e) }); }

// design_handoff_marysoll/ui_kits/app/AppShell.jsx
try { (() => {
function AppShell({
  user,
  screen,
  onScreen,
  children,
  onLogout
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "app-shell"
  }, /*#__PURE__*/React.createElement("header", {
    className: "app-header"
  }, /*#__PURE__*/React.createElement("a", {
    className: "app-logo"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo.svg",
    alt: "Marysoll"
  })), /*#__PURE__*/React.createElement("nav", {
    className: "app-nav"
  }, /*#__PURE__*/React.createElement("button", {
    className: screen === 'dashboard' ? 'active' : '',
    onClick: () => onScreen('dashboard')
  }, "Moji termini"), /*#__PURE__*/React.createElement("button", {
    className: screen === 'book' ? 'active' : '',
    onClick: () => onScreen('book')
  }, "Zaka\u017Ei novi"), /*#__PURE__*/React.createElement("button", {
    className: screen === 'salons' ? 'active' : '',
    onClick: () => onScreen('salons')
  }, "Saloni")), /*#__PURE__*/React.createElement("div", {
    className: "app-spacer"
  }), user ? /*#__PURE__*/React.createElement("div", {
    className: "app-user"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-avatar"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/avatars/claudia.png",
    alt: ""
  })), /*#__PURE__*/React.createElement("span", null, user.name), /*#__PURE__*/React.createElement("button", {
    className: "ms-icon-btn",
    onClick: onLogout,
    "aria-label": "Logout"
  }, /*#__PURE__*/React.createElement(Icon.X, {
    width: "14",
    height: "14"
  }))) : null), /*#__PURE__*/React.createElement("main", {
    className: "app-main"
  }, children));
}
window.AppShell = AppShell;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_marysoll/ui_kits/app/AppShell.jsx", error: String((e && e.message) || e) }); }

// design_handoff_marysoll/ui_kits/app/AppointmentsList.jsx
try { (() => {
function AppointmentsList({
  appointments,
  onCancel
}) {
  const upcoming = appointments.filter(a => !a.past);
  const past = appointments.filter(a => a.past);
  return /*#__PURE__*/React.createElement("div", {
    className: "appts"
  }, /*#__PURE__*/React.createElement("div", {
    className: "appts-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms-eyebrow"
  }, "Moji termini"), /*#__PURE__*/React.createElement("h2", {
    className: "ms-h2"
  }, "Predstoje\u0107i termini")), upcoming.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "Nema\u0161 zakazanih termina. ", /*#__PURE__*/React.createElement("a", {
    href: "#book"
  }, "Zaka\u017Ei sada \u2192")) : /*#__PURE__*/React.createElement("div", {
    className: "appts-grid"
  }, upcoming.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    className: "appt-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "appt-when"
  }, /*#__PURE__*/React.createElement(Icon.Calendar, {
    width: "18",
    height: "18"
  }), /*#__PURE__*/React.createElement("strong", null, a.date), " \xB7 ", a.time), /*#__PURE__*/React.createElement("div", {
    className: "appt-service"
  }, a.service), /*#__PURE__*/React.createElement("div", {
    className: "appt-salon"
  }, /*#__PURE__*/React.createElement(Icon.MapPin, {
    width: "14",
    height: "14"
  }), " ", a.salon), /*#__PURE__*/React.createElement("div", {
    className: "appt-foot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms-tag",
    style: {
      background: '#E9F8EE',
      color: '#1F9D55'
    }
  }, "\u2714 Potvr\u0111eno"), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-secondary ms-btn-sm",
    onClick: () => onCancel(a.id)
  }, "Otka\u017Ei"))))), /*#__PURE__*/React.createElement("h3", {
    className: "ms-h3",
    style: {
      marginTop: 36
    }
  }, "Istorija"), /*#__PURE__*/React.createElement("div", {
    className: "appts-grid muted"
  }, past.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    className: "appt-card past"
  }, /*#__PURE__*/React.createElement("div", {
    className: "appt-when"
  }, a.date, " \xB7 ", a.time), /*#__PURE__*/React.createElement("div", {
    className: "appt-service"
  }, a.service), /*#__PURE__*/React.createElement("div", {
    className: "appt-salon"
  }, a.salon)))));
}
window.AppointmentsList = AppointmentsList;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_marysoll/ui_kits/app/AppointmentsList.jsx", error: String((e && e.message) || e) }); }

// design_handoff_marysoll/ui_kits/app/CalendarBlock.jsx
try { (() => {
function CalendarBlock({
  aiSuggested,
  onConfirm
}) {
  const [service, setService] = React.useState('Masaža leđa · 30 min');
  const [date, setDate] = React.useState('Sreda, 14. maj');
  const [time, setTime] = React.useState(aiSuggested ? '14:00' : null);
  const [variant, setVariant] = React.useState('30 min');
  const slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '13:00', '13:30', '14:00', '14:30', '15:00'];
  const variants = ['30 min', '45 min', '60 min', '90 min'];
  return /*#__PURE__*/React.createElement("div", {
    className: "cal-block"
  }, aiSuggested && /*#__PURE__*/React.createElement("div", {
    className: "ai-suggest"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-avatar sm"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/avatars/maria.png",
    alt: ""
  })), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Maria:"), " Unela sam podatke ", /*#__PURE__*/React.createElement("strong", null, service), " u ", /*#__PURE__*/React.createElement("strong", null, time)), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-primary ms-btn-sm",
    onClick: onConfirm
  }, "Potvrdi")), /*#__PURE__*/React.createElement("select", {
    className: "cal-select",
    value: service,
    onChange: e => setService(e.target.value)
  }, /*#__PURE__*/React.createElement("option", null, "Masa\u017Ea le\u0111a \xB7 30 min"), /*#__PURE__*/React.createElement("option", null, "Masa\u017Ea celog tela \xB7 60 min"), /*#__PURE__*/React.createElement("option", null, "Tretman lica \xB7 klasik"), /*#__PURE__*/React.createElement("option", null, "\u0160i\u0161anje + pranje")), /*#__PURE__*/React.createElement("div", {
    className: "cal-variants"
  }, variants.map(v => /*#__PURE__*/React.createElement("button", {
    key: v,
    className: `cal-variant ${variant === v ? 'active' : ''}`,
    onClick: () => setVariant(v)
  }, v))), /*#__PURE__*/React.createElement("input", {
    type: "text",
    className: "cal-date",
    value: date,
    onChange: e => setDate(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "cal-slots"
  }, slots.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: `cal-slot ${time === t ? 'active' : ''}`,
    onClick: () => setTime(t)
  }, t))), /*#__PURE__*/React.createElement("div", {
    className: "cal-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cal-price"
  }, "2 400 RSD"), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-dark ms-btn-md",
    disabled: !time,
    onClick: onConfirm
  }, "Zaka\u017Ei termin")));
}
window.CalendarBlock = CalendarBlock;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_marysoll/ui_kits/app/CalendarBlock.jsx", error: String((e && e.message) || e) }); }

// design_handoff_marysoll/ui_kits/app/LoginCard.jsx
try { (() => {
function LoginCard({
  onLogin
}) {
  const [mode, setMode] = React.useState('login');
  return /*#__PURE__*/React.createElement("div", {
    className: "login-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-tabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: mode === 'login' ? 'active' : '',
    onClick: () => setMode('login')
  }, "Prijava"), /*#__PURE__*/React.createElement("button", {
    className: mode === 'register' ? 'active' : '',
    onClick: () => setMode('register')
  }, "Registracija")), /*#__PURE__*/React.createElement("h2", {
    className: "ms-h2",
    style: {
      margin: '8px 0 4px'
    }
  }, mode === 'login' ? 'Dobro došli nazad' : 'Napravi nalog'), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--fg-2)',
      margin: '0 0 18px'
    }
  }, mode === 'login' ? 'Prijavi se da vidiš svoje termine i razgovore sa Marijom.' : 'Registracija traje manje od 30 sekundi.'), mode === 'register' && /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "Ime"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Marija Petrovi\u0107"
  })), /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "Email"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    placeholder: "ti@primer.rs"
  })), /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "Lozinka"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
  })), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-primary ms-btn-md",
    onClick: onLogin,
    style: {
      width: '100%',
      marginTop: 14
    }
  }, mode === 'login' ? 'Prijavi se' : 'Napravi nalog'), mode === 'login' && /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "forgot"
  }, "Zaboravljena lozinka?"));
}
window.LoginCard = LoginCard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_marysoll/ui_kits/app/LoginCard.jsx", error: String((e && e.message) || e) }); }

// design_handoff_marysoll/ui_kits/landing/AIDrawer.jsx
try { (() => {
function AIDrawer({
  open,
  onClose
}) {
  const [thread, setThread] = React.useState([{
    from: 'maria',
    text: 'Zdravo! Ja sam Maria. Mogu da pronađem slobodan termin, popunim formu ili da te prijavim. Šta želiš?'
  }]);
  const [input, setInput] = React.useState('');
  const send = () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setThread(t => [...t, {
      from: 'me',
      text: msg
    }]);
    setInput('');
    setTimeout(() => {
      setThread(t => [...t, {
        from: 'maria',
        kind: 'suggest',
        text: 'Imam slobodan termin za masažu leđa danas u 14:00 u Studio Lavanda. Da popunim formu i potvrdim?'
      }]);
    }, 600);
  };
  return /*#__PURE__*/React.createElement("aside", {
    className: `ms-drawer ${open ? 'open' : ''}`,
    "aria-hidden": !open
  }, /*#__PURE__*/React.createElement("header", {
    className: "ms-drawer-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-drawer-id"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-avatar"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/avatars/maria.png",
    alt: ""
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "ms-drawer-name"
  }, "Maria Deep"), /*#__PURE__*/React.createElement("div", {
    className: "ms-drawer-status"
  }, "AI asistent \xB7 online"))), /*#__PURE__*/React.createElement("button", {
    className: "ms-icon-btn",
    onClick: onClose,
    "aria-label": "Zatvori"
  }, /*#__PURE__*/React.createElement(Icon.X, {
    width: "18",
    height: "18"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "ms-drawer-body scrollbar-custom"
  }, thread.map((m, i) => m.from === 'maria' ? /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "ms-msg ms-msg-maria"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-avatar sm"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/avatars/maria.png",
    alt: ""
  })), /*#__PURE__*/React.createElement("div", {
    className: "ms-bubble"
  }, m.text, m.kind === 'suggest' && /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-secondary ms-btn-sm",
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Icon.Check, {
    width: "14",
    height: "14"
  }), " Potvrdi termin"))) : /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "ms-msg ms-msg-me"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-bubble"
  }, m.text)))), /*#__PURE__*/React.createElement("div", {
    className: "ms-drawer-suggest"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ms-chip",
    onClick: () => setInput('Najbliži salon za masažu')
  }, "Najbli\u017Ei salon"), /*#__PURE__*/React.createElement("button", {
    className: "ms-chip",
    onClick: () => setInput('Šta sam zakazala?')
  }, "Moji termini"), /*#__PURE__*/React.createElement("button", {
    className: "ms-chip",
    onClick: () => setInput('Otkaži termin sutra')
  }, "Otka\u017Ei termin")), /*#__PURE__*/React.createElement("div", {
    className: "ms-drawer-input"
  }, /*#__PURE__*/React.createElement("textarea", {
    rows: 1,
    placeholder: "Pitaj Mariju\u2026",
    value: input,
    onChange: e => setInput(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-primary ms-btn-sm",
    onClick: send
  }, /*#__PURE__*/React.createElement(Icon.Send, {
    width: "14",
    height: "14"
  }))));
}
window.AIDrawer = AIDrawer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_marysoll/ui_kits/landing/AIDrawer.jsx", error: String((e && e.message) || e) }); }

// design_handoff_marysoll/ui_kits/landing/AIPrompt.jsx
try { (() => {
function AIPrompt({
  onAskAI
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "ms-ai-prompt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-ai-prompt-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-ai-avatar"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/avatars/maria.png",
    alt: ""
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "ms-h3"
  }, "Ne zna\u0161 \u0161ta ti treba?"), /*#__PURE__*/React.createElement("p", {
    className: "ms-ai-prompt-sub"
  }, "Maria mo\u017Ee da rezervi\u0161e, prika\u017Ee slobodne termine i ispuni kalendar umesto tebe \u2014 uz jedan klik za potvrdu.")), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-secondary ms-btn-md",
    onClick: onAskAI
  }, /*#__PURE__*/React.createElement(Icon.Sparkles, {
    width: "16",
    height: "16"
  }), " Pitaj asistenta")));
}
window.AIPrompt = AIPrompt;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_marysoll/ui_kits/landing/AIPrompt.jsx", error: String((e && e.message) || e) }); }

// design_handoff_marysoll/ui_kits/landing/BookingWidget.jsx
try { (() => {
function BookingWidget({
  onConfirm,
  onAskAI
}) {
  const [service, setService] = React.useState('Masaža leđa · 30 min');
  const [time, setTime] = React.useState('14:00');
  const slots = ['12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
  return /*#__PURE__*/React.createElement("section", {
    className: "ms-bw-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-bw-copy"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms-eyebrow"
  }, "Salon Lavanda \xB7 0.4 km"), /*#__PURE__*/React.createElement("h2", {
    className: "ms-h2"
  }, "\u010Cekamo umesto vas u redu.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    className: "ms-script"
  }, "Zovemo vas"), " za prvi slobodan termin."), /*#__PURE__*/React.createElement("p", {
    className: "ms-bw-sub"
  }, "Ostavi ime i broj \u2014 javljamo se u roku od 15 minuta sa potvrdom."), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-ghost ms-btn-md",
    onClick: onAskAI
  }, /*#__PURE__*/React.createElement(Icon.Sparkles, {
    width: "16",
    height: "16"
  }), " Pitaj asistenta")), /*#__PURE__*/React.createElement("div", {
    className: "ms-bw"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-bw-head"
  }, /*#__PURE__*/React.createElement("h3", null, "Zaka\u017Ei termin"), /*#__PURE__*/React.createElement("span", {
    className: "ms-tag"
  }, "Studio Lavanda")), /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "Usluga"), /*#__PURE__*/React.createElement("select", {
    value: service,
    onChange: e => setService(e.target.value)
  }, /*#__PURE__*/React.createElement("option", null, "Masa\u017Ea le\u0111a \xB7 30 min"), /*#__PURE__*/React.createElement("option", null, "Masa\u017Ea celog tela \xB7 60 min"), /*#__PURE__*/React.createElement("option", null, "Tretman lica"), /*#__PURE__*/React.createElement("option", null, "\u0160i\u0161anje"))), /*#__PURE__*/React.createElement("div", {
    className: "ms-row-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "Datum"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    defaultValue: "Sreda, 14. maj"
  })), /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "Telefon"), /*#__PURE__*/React.createElement("input", {
    type: "tel",
    placeholder: "+381 \u2026"
  }))), /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "Ime"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Marija Petrovi\u0107"
  })), /*#__PURE__*/React.createElement("div", {
    className: "ms-slot-grid"
  }, slots.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: `ms-slot ${time === t ? 'ms-slot-active' : ''}`,
    onClick: () => setTime(t)
  }, t))), /*#__PURE__*/React.createElement("div", {
    className: "ms-bw-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-price"
  }, "2 400 RSD"), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-dark ms-btn-md",
    onClick: onConfirm
  }, "Zaka\u017Ei termin"))));
}
window.BookingWidget = BookingWidget;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_marysoll/ui_kits/landing/BookingWidget.jsx", error: String((e && e.message) || e) }); }

// design_handoff_marysoll/ui_kits/landing/Header.jsx
try { (() => {
function Header({
  onOpenAI,
  theme,
  onToggleTheme
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "ms-header"
  }, /*#__PURE__*/React.createElement("a", {
    className: "ms-logo",
    href: "#"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo.svg",
    alt: "Marysoll"
  })), /*#__PURE__*/React.createElement("div", {
    className: "ms-spacer"
  }), /*#__PURE__*/React.createElement("button", {
    className: "ms-icon-btn",
    onClick: onToggleTheme,
    "aria-label": "Toggle theme"
  }, theme === 'dark' ? /*#__PURE__*/React.createElement(Icon.Sun, {
    width: "18",
    height: "18"
  }) : /*#__PURE__*/React.createElement(Icon.Moon, {
    width: "18",
    height: "18"
  })), /*#__PURE__*/React.createElement("button", {
    className: "ms-pill"
  }, "SR ", /*#__PURE__*/React.createElement(Icon.ChevronDown, {
    width: "12",
    height: "12"
  })), /*#__PURE__*/React.createElement("button", {
    className: "ms-pill"
  }, /*#__PURE__*/React.createElement(Icon.MapPin, {
    width: "14",
    height: "14"
  }), " Novi Sad ", /*#__PURE__*/React.createElement(Icon.ChevronDown, {
    width: "12",
    height: "12"
  })), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-primary ms-btn-sm"
  }, "Login"), /*#__PURE__*/React.createElement("button", {
    className: "ms-ai-trigger",
    onClick: onOpenAI
  }, /*#__PURE__*/React.createElement(Icon.Sparkles, {
    width: "16",
    height: "16"
  }), " Pitaj Mariju"));
}
window.Header = Header;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_marysoll/ui_kits/landing/Header.jsx", error: String((e && e.message) || e) }); }

// design_handoff_marysoll/ui_kits/landing/Hero.jsx
try { (() => {
function Hero({
  onPrimary,
  onAskAI
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "ms-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-hero-blob",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("div", {
    className: "ms-hero-blob ms-hero-blob-r",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("div", {
    className: "ms-eyebrow"
  }, "Marysoll \xB7 Novi Sad \xB7 Beograd \xB7 Ni\u0161 \xB7 Bor"), /*#__PURE__*/React.createElement("h1", {
    className: "ms-h1 ms-display"
  }, "Slobodni termini", /*#__PURE__*/React.createElement("br", null), "u salonima ", /*#__PURE__*/React.createElement("span", {
    className: "ms-script"
  }, "danas")), /*#__PURE__*/React.createElement("p", {
    className: "ms-hero-sub"
  }, "Prona\u0111i masa\u017Eu, tretman ili \u0161i\u0161anje u svom gradu i rezervi\u0161i odmah \u2014 bez poziva, bez \u010Dekanja."), /*#__PURE__*/React.createElement("label", {
    className: "ms-hero-search"
  }, /*#__PURE__*/React.createElement(Icon.Search, {
    width: "20",
    height: "20"
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Otkrijte i rezervi\u0161ite stru\u010Dnjake za lepotu i velnes u va\u0161oj blizini"
  }), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-primary ms-btn-md ms-hero-search-btn",
    onClick: onPrimary
  }, "Pretra\u017Ei")), /*#__PURE__*/React.createElement("div", {
    className: "ms-hero-cta"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-ghost ms-btn-lg",
    onClick: onAskAI
  }, /*#__PURE__*/React.createElement(Icon.Sparkles, {
    width: "18",
    height: "18"
  }), " Pitaj asistenta"), /*#__PURE__*/React.createElement("span", {
    className: "ms-hero-cta-meta"
  }, "ili izaberi kategoriju ispod")));
}
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_marysoll/ui_kits/landing/Hero.jsx", error: String((e && e.message) || e) }); }

// design_handoff_marysoll/ui_kits/landing/QuickAccess.jsx
try { (() => {
function QuickAccess({
  onPick
}) {
  const cats = [{
    id: 'nokti',
    label: 'Nokti',
    meta: 'Maникir · Gel · Nail art',
    img: '../../assets/salons/nails-kikikiss.jpg'
  }, {
    id: 'sisanje',
    label: 'Frizura',
    meta: 'Šišanje · Farbanje · Feniranje',
    img: '../../assets/salons/haircut-shisham.png'
  }, {
    id: 'masaza',
    label: 'Masaža',
    meta: 'Relaks · Sportska · Aroma',
    img: '../../assets/salons/gel-kikikiss.jpg'
  }, {
    id: 'sminka',
    label: 'Šminka',
    meta: 'Dnevna · Večernja · Mladenačka',
    img: '../../assets/salons/makeup-belisimo.png'
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "ms-quick"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-section-head ms-section-head-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms-eyebrow"
  }, "Brzi pristup"), /*#__PURE__*/React.createElement("h2", {
    className: "ms-h2"
  }, "\u0160ta ti treba danas?")), /*#__PURE__*/React.createElement("div", {
    className: "ms-quick-grid"
  }, cats.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.id,
    className: "ms-quick-card",
    onClick: () => onPick && onPick(c)
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-quick-img",
    style: {
      backgroundImage: `url(${c.img})`
    },
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "ms-quick-label"
  }, c.label), /*#__PURE__*/React.createElement("span", {
    className: "ms-quick-meta"
  }, c.meta)))));
}
window.QuickAccess = QuickAccess;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_marysoll/ui_kits/landing/QuickAccess.jsx", error: String((e && e.message) || e) }); }

// design_handoff_marysoll/ui_kits/landing/StickyOffer.jsx
try { (() => {
function StickyOffer({
  visible,
  onDismiss,
  onBook
}) {
  if (!visible) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "ms-sticky"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-sticky-bolt"
  }, /*#__PURE__*/React.createElement(Icon.Bolt, {
    width: "18",
    height: "18"
  })), /*#__PURE__*/React.createElement("div", {
    className: "ms-sticky-text"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms-sticky-eyebrow"
  }, "Brzo"), /*#__PURE__*/React.createElement("span", {
    className: "ms-sticky-line"
  }, "Prvi slobodan termin u 14:00")), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-primary ms-btn-sm",
    onClick: onBook
  }, "Rezervi\u0161i"), /*#__PURE__*/React.createElement("button", {
    className: "ms-sticky-close",
    onClick: onDismiss,
    "aria-label": "Zatvori"
  }, /*#__PURE__*/React.createElement(Icon.X, {
    width: "14",
    height: "14"
  })));
}
window.StickyOffer = StickyOffer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_marysoll/ui_kits/landing/StickyOffer.jsx", error: String((e && e.message) || e) }); }

// design_handoff_marysoll/ui_kits/landing/TrustRow.jsx
try { (() => {
function TrustRow() {
  const items = ['Slobodni termini u realnom vremenu', 'Rezervacija bez poziva', 'Više salona na jednom mestu', 'Gotovo za 30 sekundi'];
  return /*#__PURE__*/React.createElement("ul", {
    className: "ms-trust"
  }, items.map(t => /*#__PURE__*/React.createElement("li", {
    key: t
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms-check"
  }, "\u2714"), t)));
}
window.TrustRow = TrustRow;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_marysoll/ui_kits/landing/TrustRow.jsx", error: String((e && e.message) || e) }); }

// design_handoff_marysoll/ui_kits/shared/Icons.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Shared icon helpers used across UI kits */
const Icon = {
  Sparkles: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
  })),
  Bolt: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M3.75 13.5 14.25 3 12 9.75h7.5L9.75 21l2.25-7.5H3.75Z"
  })),
  Calendar: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
  })),
  MapPin: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
  }), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
  })),
  Search: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
  })),
  User: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
  })),
  Sun: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
  })),
  Moon: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
  })),
  ChevronDown: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "m19.5 8.25-7.5 7.5-7.5-7.5"
  })),
  X: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M6 18 18 6M6 6l12 12"
  })),
  Send: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
  })),
  Check: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "2",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "m4.5 12.75 6 6 9-13.5"
  }))
};
window.Icon = Icon;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_marysoll/ui_kits/shared/Icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AIAgentDock.jsx
try { (() => {
function AIAgentDock({
  onSubmit,
  isLoading,
  thread
}) {
  const [input, setInput] = React.useState('');
  const send = () => {
    if (!input.trim()) return;
    onSubmit(input.trim());
    setInput('');
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "ai-dock"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ai-dock-inner"
  }, /*#__PURE__*/React.createElement("p", {
    className: "ai-dock-tag"
  }, isLoading ? 'Ažuriram predloge komponenti…' : 'Boost your experience. Marysoll Assistant AI.'), /*#__PURE__*/React.createElement("div", {
    className: "ai-dock-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ai-dock-bolt",
    "aria-label": "Statistika"
  }, /*#__PURE__*/React.createElement(Icon.Bolt, {
    width: "18",
    height: "18"
  })), /*#__PURE__*/React.createElement("textarea", {
    rows: 1,
    placeholder: "Pitaj Mariju\u2026",
    value: input,
    onChange: e => setInput(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-secondary ms-btn-md",
    onClick: send,
    disabled: isLoading || !input.trim()
  }, isLoading ? 'Slanje…' : 'Pošalji'))));
}
window.AIAgentDock = AIAgentDock;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AIAgentDock.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AppShell.jsx
try { (() => {
function AppShell({
  user,
  screen,
  onScreen,
  children,
  onLogout
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "app-shell"
  }, /*#__PURE__*/React.createElement("header", {
    className: "app-header"
  }, /*#__PURE__*/React.createElement("a", {
    className: "app-logo"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo.svg",
    alt: "Marysoll"
  })), /*#__PURE__*/React.createElement("nav", {
    className: "app-nav"
  }, /*#__PURE__*/React.createElement("button", {
    className: screen === 'dashboard' ? 'active' : '',
    onClick: () => onScreen('dashboard')
  }, "Moji termini"), /*#__PURE__*/React.createElement("button", {
    className: screen === 'book' ? 'active' : '',
    onClick: () => onScreen('book')
  }, "Zaka\u017Ei novi"), /*#__PURE__*/React.createElement("button", {
    className: screen === 'salons' ? 'active' : '',
    onClick: () => onScreen('salons')
  }, "Saloni")), /*#__PURE__*/React.createElement("div", {
    className: "app-spacer"
  }), user ? /*#__PURE__*/React.createElement("div", {
    className: "app-user"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-avatar"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/avatars/claudia.png",
    alt: ""
  })), /*#__PURE__*/React.createElement("span", null, user.name), /*#__PURE__*/React.createElement("button", {
    className: "ms-icon-btn",
    onClick: onLogout,
    "aria-label": "Logout"
  }, /*#__PURE__*/React.createElement(Icon.X, {
    width: "14",
    height: "14"
  }))) : null), /*#__PURE__*/React.createElement("main", {
    className: "app-main"
  }, children));
}
window.AppShell = AppShell;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AppointmentsList.jsx
try { (() => {
function AppointmentsList({
  appointments,
  onCancel
}) {
  const upcoming = appointments.filter(a => !a.past);
  const past = appointments.filter(a => a.past);
  return /*#__PURE__*/React.createElement("div", {
    className: "appts"
  }, /*#__PURE__*/React.createElement("div", {
    className: "appts-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms-eyebrow"
  }, "Moji termini"), /*#__PURE__*/React.createElement("h2", {
    className: "ms-h2"
  }, "Predstoje\u0107i termini")), upcoming.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "Nema\u0161 zakazanih termina. ", /*#__PURE__*/React.createElement("a", {
    href: "#book"
  }, "Zaka\u017Ei sada \u2192")) : /*#__PURE__*/React.createElement("div", {
    className: "appts-grid"
  }, upcoming.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    className: "appt-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "appt-when"
  }, /*#__PURE__*/React.createElement(Icon.Calendar, {
    width: "18",
    height: "18"
  }), /*#__PURE__*/React.createElement("strong", null, a.date), " \xB7 ", a.time), /*#__PURE__*/React.createElement("div", {
    className: "appt-service"
  }, a.service), /*#__PURE__*/React.createElement("div", {
    className: "appt-salon"
  }, /*#__PURE__*/React.createElement(Icon.MapPin, {
    width: "14",
    height: "14"
  }), " ", a.salon), /*#__PURE__*/React.createElement("div", {
    className: "appt-foot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms-tag",
    style: {
      background: '#E9F8EE',
      color: '#1F9D55'
    }
  }, "\u2714 Potvr\u0111eno"), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-secondary ms-btn-sm",
    onClick: () => onCancel(a.id)
  }, "Otka\u017Ei"))))), /*#__PURE__*/React.createElement("h3", {
    className: "ms-h3",
    style: {
      marginTop: 36
    }
  }, "Istorija"), /*#__PURE__*/React.createElement("div", {
    className: "appts-grid muted"
  }, past.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    className: "appt-card past"
  }, /*#__PURE__*/React.createElement("div", {
    className: "appt-when"
  }, a.date, " \xB7 ", a.time), /*#__PURE__*/React.createElement("div", {
    className: "appt-service"
  }, a.service), /*#__PURE__*/React.createElement("div", {
    className: "appt-salon"
  }, a.salon)))));
}
window.AppointmentsList = AppointmentsList;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AppointmentsList.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/CalendarBlock.jsx
try { (() => {
function CalendarBlock({
  aiSuggested,
  onConfirm
}) {
  const [service, setService] = React.useState('Masaža leđa · 30 min');
  const [date, setDate] = React.useState('Sreda, 14. maj');
  const [time, setTime] = React.useState(aiSuggested ? '14:00' : null);
  const [variant, setVariant] = React.useState('30 min');
  const slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '13:00', '13:30', '14:00', '14:30', '15:00'];
  const variants = ['30 min', '45 min', '60 min', '90 min'];
  return /*#__PURE__*/React.createElement("div", {
    className: "cal-block"
  }, aiSuggested && /*#__PURE__*/React.createElement("div", {
    className: "ai-suggest"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-avatar sm"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/avatars/maria.png",
    alt: ""
  })), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Maria:"), " Unela sam podatke ", /*#__PURE__*/React.createElement("strong", null, service), " u ", /*#__PURE__*/React.createElement("strong", null, time)), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-primary ms-btn-sm",
    onClick: onConfirm
  }, "Potvrdi")), /*#__PURE__*/React.createElement("select", {
    className: "cal-select",
    value: service,
    onChange: e => setService(e.target.value)
  }, /*#__PURE__*/React.createElement("option", null, "Masa\u017Ea le\u0111a \xB7 30 min"), /*#__PURE__*/React.createElement("option", null, "Masa\u017Ea celog tela \xB7 60 min"), /*#__PURE__*/React.createElement("option", null, "Tretman lica \xB7 klasik"), /*#__PURE__*/React.createElement("option", null, "\u0160i\u0161anje + pranje")), /*#__PURE__*/React.createElement("div", {
    className: "cal-variants"
  }, variants.map(v => /*#__PURE__*/React.createElement("button", {
    key: v,
    className: `cal-variant ${variant === v ? 'active' : ''}`,
    onClick: () => setVariant(v)
  }, v))), /*#__PURE__*/React.createElement("input", {
    type: "text",
    className: "cal-date",
    value: date,
    onChange: e => setDate(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "cal-slots"
  }, slots.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: `cal-slot ${time === t ? 'active' : ''}`,
    onClick: () => setTime(t)
  }, t))), /*#__PURE__*/React.createElement("div", {
    className: "cal-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cal-price"
  }, "2 400 RSD"), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-dark ms-btn-md",
    disabled: !time,
    onClick: onConfirm
  }, "Zaka\u017Ei termin")));
}
window.CalendarBlock = CalendarBlock;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/CalendarBlock.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/LoginCard.jsx
try { (() => {
function LoginCard({
  onLogin
}) {
  const [mode, setMode] = React.useState('login');
  return /*#__PURE__*/React.createElement("div", {
    className: "login-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-tabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: mode === 'login' ? 'active' : '',
    onClick: () => setMode('login')
  }, "Prijava"), /*#__PURE__*/React.createElement("button", {
    className: mode === 'register' ? 'active' : '',
    onClick: () => setMode('register')
  }, "Registracija")), /*#__PURE__*/React.createElement("h2", {
    className: "ms-h2",
    style: {
      margin: '8px 0 4px'
    }
  }, mode === 'login' ? 'Dobro došli nazad' : 'Napravi nalog'), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--fg-2)',
      margin: '0 0 18px'
    }
  }, mode === 'login' ? 'Prijavi se da vidiš svoje termine i razgovore sa Marijom.' : 'Registracija traje manje od 30 sekundi.'), mode === 'register' && /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "Ime"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Marija Petrovi\u0107"
  })), /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "Email"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    placeholder: "ti@primer.rs"
  })), /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "Lozinka"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
  })), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-primary ms-btn-md",
    onClick: onLogin,
    style: {
      width: '100%',
      marginTop: 14
    }
  }, mode === 'login' ? 'Prijavi se' : 'Napravi nalog'), mode === 'login' && /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "forgot"
  }, "Zaboravljena lozinka?"));
}
window.LoginCard = LoginCard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/LoginCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/AIDrawer.jsx
try { (() => {
function AIDrawer({
  open,
  onClose
}) {
  const [thread, setThread] = React.useState([{
    from: 'maria',
    text: 'Zdravo! Ja sam Maria. Mogu da pronađem slobodan termin, popunim formu ili da te prijavim. Šta želiš?'
  }]);
  const [input, setInput] = React.useState('');
  const send = () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setThread(t => [...t, {
      from: 'me',
      text: msg
    }]);
    setInput('');
    setTimeout(() => {
      setThread(t => [...t, {
        from: 'maria',
        kind: 'suggest',
        text: 'Imam slobodan termin za masažu leđa danas u 14:00 u Studio Lavanda. Da popunim formu i potvrdim?'
      }]);
    }, 600);
  };
  return /*#__PURE__*/React.createElement("aside", {
    className: `ms-drawer ${open ? 'open' : ''}`,
    "aria-hidden": !open
  }, /*#__PURE__*/React.createElement("header", {
    className: "ms-drawer-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-drawer-id"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-avatar"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/avatars/maria.png",
    alt: ""
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "ms-drawer-name"
  }, "Maria Deep"), /*#__PURE__*/React.createElement("div", {
    className: "ms-drawer-status"
  }, "AI asistent \xB7 online"))), /*#__PURE__*/React.createElement("button", {
    className: "ms-icon-btn",
    onClick: onClose,
    "aria-label": "Zatvori"
  }, /*#__PURE__*/React.createElement(Icon.X, {
    width: "18",
    height: "18"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "ms-drawer-body scrollbar-custom"
  }, thread.map((m, i) => m.from === 'maria' ? /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "ms-msg ms-msg-maria"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-avatar sm"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/avatars/maria.png",
    alt: ""
  })), /*#__PURE__*/React.createElement("div", {
    className: "ms-bubble"
  }, m.text, m.kind === 'suggest' && /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-secondary ms-btn-sm",
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Icon.Check, {
    width: "14",
    height: "14"
  }), " Potvrdi termin"))) : /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "ms-msg ms-msg-me"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-bubble"
  }, m.text)))), /*#__PURE__*/React.createElement("div", {
    className: "ms-drawer-suggest"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ms-chip",
    onClick: () => setInput('Najbliži salon za masažu')
  }, "Najbli\u017Ei salon"), /*#__PURE__*/React.createElement("button", {
    className: "ms-chip",
    onClick: () => setInput('Šta sam zakazala?')
  }, "Moji termini"), /*#__PURE__*/React.createElement("button", {
    className: "ms-chip",
    onClick: () => setInput('Otkaži termin sutra')
  }, "Otka\u017Ei termin")), /*#__PURE__*/React.createElement("div", {
    className: "ms-drawer-input"
  }, /*#__PURE__*/React.createElement("textarea", {
    rows: 1,
    placeholder: "Pitaj Mariju\u2026",
    value: input,
    onChange: e => setInput(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-primary ms-btn-sm",
    onClick: send
  }, /*#__PURE__*/React.createElement(Icon.Send, {
    width: "14",
    height: "14"
  }))));
}
window.AIDrawer = AIDrawer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/AIDrawer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/AIPrompt.jsx
try { (() => {
function AIPrompt({
  onAskAI
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "ms-ai-prompt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-ai-prompt-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-ai-avatar"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/avatars/maria.png",
    alt: ""
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "ms-h3"
  }, "Ne zna\u0161 \u0161ta ti treba?"), /*#__PURE__*/React.createElement("p", {
    className: "ms-ai-prompt-sub"
  }, "Maria mo\u017Ee da rezervi\u0161e, prika\u017Ee slobodne termine i ispuni kalendar umesto tebe \u2014 uz jedan klik za potvrdu.")), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-secondary ms-btn-md",
    onClick: onAskAI
  }, /*#__PURE__*/React.createElement(Icon.Sparkles, {
    width: "16",
    height: "16"
  }), " Pitaj asistenta")));
}
window.AIPrompt = AIPrompt;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/AIPrompt.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/BookingWidget.jsx
try { (() => {
function BookingWidget({
  onConfirm,
  onAskAI
}) {
  const [service, setService] = React.useState('Masaža leđa · 30 min');
  const [time, setTime] = React.useState('14:00');
  const slots = ['12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
  return /*#__PURE__*/React.createElement("section", {
    className: "ms-bw-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-bw-copy"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms-eyebrow"
  }, "Salon Lavanda \xB7 0.4 km"), /*#__PURE__*/React.createElement("h2", {
    className: "ms-h2"
  }, "\u010Cekamo umesto vas u redu.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    className: "ms-script"
  }, "Zovemo vas"), " za prvi slobodan termin."), /*#__PURE__*/React.createElement("p", {
    className: "ms-bw-sub"
  }, "Ostavi ime i broj \u2014 javljamo se u roku od 15 minuta sa potvrdom."), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-ghost ms-btn-md",
    onClick: onAskAI
  }, /*#__PURE__*/React.createElement(Icon.Sparkles, {
    width: "16",
    height: "16"
  }), " Pitaj asistenta")), /*#__PURE__*/React.createElement("div", {
    className: "ms-bw"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-bw-head"
  }, /*#__PURE__*/React.createElement("h3", null, "Zaka\u017Ei termin"), /*#__PURE__*/React.createElement("span", {
    className: "ms-tag"
  }, "Studio Lavanda")), /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "Usluga"), /*#__PURE__*/React.createElement("select", {
    value: service,
    onChange: e => setService(e.target.value)
  }, /*#__PURE__*/React.createElement("option", null, "Masa\u017Ea le\u0111a \xB7 30 min"), /*#__PURE__*/React.createElement("option", null, "Masa\u017Ea celog tela \xB7 60 min"), /*#__PURE__*/React.createElement("option", null, "Tretman lica"), /*#__PURE__*/React.createElement("option", null, "\u0160i\u0161anje"))), /*#__PURE__*/React.createElement("div", {
    className: "ms-row-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "Datum"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    defaultValue: "Sreda, 14. maj"
  })), /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "Telefon"), /*#__PURE__*/React.createElement("input", {
    type: "tel",
    placeholder: "+381 \u2026"
  }))), /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "Ime"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Marija Petrovi\u0107"
  })), /*#__PURE__*/React.createElement("div", {
    className: "ms-slot-grid"
  }, slots.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: `ms-slot ${time === t ? 'ms-slot-active' : ''}`,
    onClick: () => setTime(t)
  }, t))), /*#__PURE__*/React.createElement("div", {
    className: "ms-bw-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-price"
  }, "2 400 RSD"), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-dark ms-btn-md",
    onClick: onConfirm
  }, "Zaka\u017Ei termin"))));
}
window.BookingWidget = BookingWidget;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/BookingWidget.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/Header.jsx
try { (() => {
function Header({
  onOpenAI,
  theme,
  onToggleTheme
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "ms-header"
  }, /*#__PURE__*/React.createElement("a", {
    className: "ms-logo",
    href: "#"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo.svg",
    alt: "Marysoll"
  })), /*#__PURE__*/React.createElement("div", {
    className: "ms-spacer"
  }), /*#__PURE__*/React.createElement("button", {
    className: "ms-icon-btn",
    onClick: onToggleTheme,
    "aria-label": "Toggle theme"
  }, theme === 'dark' ? /*#__PURE__*/React.createElement(Icon.Sun, {
    width: "18",
    height: "18"
  }) : /*#__PURE__*/React.createElement(Icon.Moon, {
    width: "18",
    height: "18"
  })), /*#__PURE__*/React.createElement("button", {
    className: "ms-pill"
  }, "SR ", /*#__PURE__*/React.createElement(Icon.ChevronDown, {
    width: "12",
    height: "12"
  })), /*#__PURE__*/React.createElement("button", {
    className: "ms-pill"
  }, /*#__PURE__*/React.createElement(Icon.MapPin, {
    width: "14",
    height: "14"
  }), " Novi Sad ", /*#__PURE__*/React.createElement(Icon.ChevronDown, {
    width: "12",
    height: "12"
  })), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-primary ms-btn-sm"
  }, "Login"), /*#__PURE__*/React.createElement("button", {
    className: "ms-ai-trigger",
    onClick: onOpenAI
  }, /*#__PURE__*/React.createElement(Icon.Sparkles, {
    width: "16",
    height: "16"
  }), " Pitaj Mariju"));
}
window.Header = Header;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/Hero.jsx
try { (() => {
function Hero({
  onPrimary,
  onAskAI
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "ms-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-hero-blob",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("div", {
    className: "ms-hero-blob ms-hero-blob-r",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("div", {
    className: "ms-eyebrow"
  }, "Marysoll \xB7 Novi Sad \xB7 Beograd \xB7 Ni\u0161 \xB7 Bor"), /*#__PURE__*/React.createElement("h1", {
    className: "ms-h1 ms-display"
  }, "Slobodni termini", /*#__PURE__*/React.createElement("br", null), "u salonima ", /*#__PURE__*/React.createElement("span", {
    className: "ms-script"
  }, "danas")), /*#__PURE__*/React.createElement("p", {
    className: "ms-hero-sub"
  }, "Prona\u0111i masa\u017Eu, tretman ili \u0161i\u0161anje u svom gradu i rezervi\u0161i odmah \u2014 bez poziva, bez \u010Dekanja."), /*#__PURE__*/React.createElement("label", {
    className: "ms-hero-search"
  }, /*#__PURE__*/React.createElement(Icon.Search, {
    width: "20",
    height: "20"
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Otkrijte i rezervi\u0161ite stru\u010Dnjake za lepotu i velnes u va\u0161oj blizini"
  }), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-primary ms-btn-md ms-hero-search-btn",
    onClick: onPrimary
  }, "Pretra\u017Ei")), /*#__PURE__*/React.createElement("div", {
    className: "ms-hero-cta"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-ghost ms-btn-lg",
    onClick: onAskAI
  }, /*#__PURE__*/React.createElement(Icon.Sparkles, {
    width: "18",
    height: "18"
  }), " Pitaj asistenta"), /*#__PURE__*/React.createElement("span", {
    className: "ms-hero-cta-meta"
  }, "ili izaberi kategoriju ispod")));
}
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/QuickAccess.jsx
try { (() => {
function QuickAccess({
  onPick
}) {
  const cats = [{
    id: 'nokti',
    label: 'Nokti',
    meta: 'Maникir · Gel · Nail art',
    img: '../../assets/salons/nails-kikikiss.jpg'
  }, {
    id: 'sisanje',
    label: 'Frizura',
    meta: 'Šišanje · Farbanje · Feniranje',
    img: '../../assets/salons/haircut-shisham.png'
  }, {
    id: 'masaza',
    label: 'Masaža',
    meta: 'Relaks · Sportska · Aroma',
    img: '../../assets/salons/gel-kikikiss.jpg'
  }, {
    id: 'sminka',
    label: 'Šminka',
    meta: 'Dnevna · Večernja · Mladenačka',
    img: '../../assets/salons/makeup-belisimo.png'
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "ms-quick"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-section-head ms-section-head-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms-eyebrow"
  }, "Brzi pristup"), /*#__PURE__*/React.createElement("h2", {
    className: "ms-h2"
  }, "\u0160ta ti treba danas?")), /*#__PURE__*/React.createElement("div", {
    className: "ms-quick-grid"
  }, cats.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.id,
    className: "ms-quick-card",
    onClick: () => onPick && onPick(c)
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-quick-img",
    style: {
      backgroundImage: `url(${c.img})`
    },
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "ms-quick-label"
  }, c.label), /*#__PURE__*/React.createElement("span", {
    className: "ms-quick-meta"
  }, c.meta)))));
}
window.QuickAccess = QuickAccess;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/QuickAccess.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/StickyOffer.jsx
try { (() => {
function StickyOffer({
  visible,
  onDismiss,
  onBook
}) {
  if (!visible) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "ms-sticky"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-sticky-bolt"
  }, /*#__PURE__*/React.createElement(Icon.Bolt, {
    width: "18",
    height: "18"
  })), /*#__PURE__*/React.createElement("div", {
    className: "ms-sticky-text"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms-sticky-eyebrow"
  }, "Brzo"), /*#__PURE__*/React.createElement("span", {
    className: "ms-sticky-line"
  }, "Prvi slobodan termin u 14:00")), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-primary ms-btn-sm",
    onClick: onBook
  }, "Rezervi\u0161i"), /*#__PURE__*/React.createElement("button", {
    className: "ms-sticky-close",
    onClick: onDismiss,
    "aria-label": "Zatvori"
  }, /*#__PURE__*/React.createElement(Icon.X, {
    width: "14",
    height: "14"
  })));
}
window.StickyOffer = StickyOffer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/StickyOffer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/TrustRow.jsx
try { (() => {
function TrustRow() {
  const items = ['Slobodni termini u realnom vremenu', 'Rezervacija bez poziva', 'Više salona na jednom mestu', 'Gotovo za 30 sekundi'];
  return /*#__PURE__*/React.createElement("ul", {
    className: "ms-trust"
  }, items.map(t => /*#__PURE__*/React.createElement("li", {
    key: t
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms-check"
  }, "\u2714"), t)));
}
window.TrustRow = TrustRow;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/TrustRow.jsx", error: String((e && e.message) || e) }); }

// ui_kits/listing/BookingFlow.jsx
try { (() => {
function BookingFlow({
  slot,
  city,
  onClose,
  onComplete
}) {
  const [step, setStep] = React.useState(1);
  const [form, setForm] = React.useState({
    name: '',
    phone: '',
    email: '',
    instagram: '',
    tiktok: ''
  });
  const update = (k, v) => setForm(f => ({
    ...f,
    [k]: v
  }));
  const valid1 = !!slot;
  const valid2 = form.name.trim() && form.phone.trim();
  return /*#__PURE__*/React.createElement("div", {
    className: "bk-shell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bk-stepper"
  }, /*#__PURE__*/React.createElement("div", {
    className: `bk-step ${step === 1 ? 'active' : 'done'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, step > 1 ? /*#__PURE__*/React.createElement(MIcon.CheckCircle, {
    width: "14",
    height: "14"
  }) : '1'), "Termin"), /*#__PURE__*/React.createElement("div", {
    className: `bk-divider ${step > 1 ? 'done' : ''}`
  }), /*#__PURE__*/React.createElement("div", {
    className: `bk-step ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, step > 2 ? /*#__PURE__*/React.createElement(MIcon.CheckCircle, {
    width: "14",
    height: "14"
  }) : '2'), "Podaci"), /*#__PURE__*/React.createElement("div", {
    className: `bk-divider ${step > 2 ? 'done' : ''}`
  }), /*#__PURE__*/React.createElement("div", {
    className: `bk-step ${step === 3 ? 'active' : ''}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "3"), "Potvrda")), step === 1 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h2", {
    className: "ms-h2",
    style: {
      margin: '0 0 14px'
    }
  }, "Potvrdi termin"), /*#__PURE__*/React.createElement("div", {
    className: "bk-summary"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bk-summary-row"
  }, /*#__PURE__*/React.createElement(MIcon.CalendarLarge, {
    width: "18",
    height: "18"
  }), " ", /*#__PURE__*/React.createElement("strong", null, "Danas"), " \xB7 ", slot.time), /*#__PURE__*/React.createElement("div", {
    className: "bk-summary-row"
  }, /*#__PURE__*/React.createElement(MIcon.Clock, {
    width: "18",
    height: "18"
  }), " ", slot.service, " \xB7 ", slot.duration, " min"), /*#__PURE__*/React.createElement("div", {
    className: "bk-summary-row"
  }, /*#__PURE__*/React.createElement(MIcon.Pin, {
    width: "18",
    height: "18"
  }), " ", slot.salon, " \xB7 ", city), /*#__PURE__*/React.createElement("div", {
    className: "bk-summary-price"
  }, /*#__PURE__*/React.createElement("span", null, "Cena"), /*#__PURE__*/React.createElement("strong", null, slot.price.toLocaleString('sr-Latn'), " RSD"))), /*#__PURE__*/React.createElement("div", {
    className: "bk-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "bk-back",
    onClick: onClose
  }, "\u2190 Nazad"), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-primary ms-btn-md",
    onClick: () => setStep(2),
    disabled: !valid1
  }, "Nastavi ", /*#__PURE__*/React.createElement(MIcon.ArrowRight, {
    width: "14",
    height: "14"
  })))), step === 2 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h2", {
    className: "ms-h2",
    style: {
      margin: '0 0 6px'
    }
  }, "Tvoji podaci"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--fg-2)',
      margin: '0 0 18px',
      font: '400 14px var(--main-font)'
    }
  }, "Trebaju nam ime i broj telefona da te salon kontaktira."), /*#__PURE__*/React.createElement("div", {
    className: "bk-fields"
  }, /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "Ime i prezime"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Marija Petrovi\u0107",
    value: form.name,
    onChange: e => update('name', e.target.value)
  })), /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "Broj telefona"), /*#__PURE__*/React.createElement("input", {
    type: "tel",
    placeholder: "+381 60 123 4567",
    value: form.phone,
    onChange: e => update('phone', e.target.value)
  })), /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "Email ", /*#__PURE__*/React.createElement("span", {
    className: "bk-field-optional"
  }, "(opciono)")), /*#__PURE__*/React.createElement("input", {
    type: "email",
    placeholder: "ti@primer.rs",
    value: form.email,
    onChange: e => update('email', e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "ms-row-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "Instagram ", /*#__PURE__*/React.createElement("span", {
    className: "bk-field-optional"
  }, "(opciono)")), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "@marija",
    value: form.instagram,
    onChange: e => update('instagram', e.target.value)
  })), /*#__PURE__*/React.createElement("label", {
    className: "ms-field"
  }, /*#__PURE__*/React.createElement("span", null, "TikTok ", /*#__PURE__*/React.createElement("span", {
    className: "bk-field-optional"
  }, "(opciono)")), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "@marija",
    value: form.tiktok,
    onChange: e => update('tiktok', e.target.value)
  })))), /*#__PURE__*/React.createElement("div", {
    className: "bk-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "bk-back",
    onClick: () => setStep(1)
  }, "\u2190 Nazad"), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-primary ms-btn-md",
    onClick: () => setStep(3),
    disabled: !valid2
  }, "Rezervi\u0161i ", /*#__PURE__*/React.createElement(MIcon.ArrowRight, {
    width: "14",
    height: "14"
  })))), step === 3 && /*#__PURE__*/React.createElement("div", {
    className: "bk-success"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bk-success-icon"
  }, /*#__PURE__*/React.createElement(MIcon.CheckCircle, {
    width: "36",
    height: "36"
  })), /*#__PURE__*/React.createElement("h2", null, "Termin potvr\u0111en!"), /*#__PURE__*/React.createElement("p", null, "Vidimo se ", /*#__PURE__*/React.createElement("strong", null, "danas u ", slot.time), " u salonu ", /*#__PURE__*/React.createElement("strong", null, slot.salon), ".", /*#__PURE__*/React.createElement("br", null), "Poslali smo ti potvrdu na ", form.phone, "."), /*#__PURE__*/React.createElement("div", {
    className: "bk-summary"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bk-summary-row"
  }, /*#__PURE__*/React.createElement(MIcon.CalendarLarge, {
    width: "18",
    height: "18"
  }), " Danas \xB7 ", slot.time), /*#__PURE__*/React.createElement("div", {
    className: "bk-summary-row"
  }, /*#__PURE__*/React.createElement(MIcon.Pin, {
    width: "18",
    height: "18"
  }), " ", slot.salon)), /*#__PURE__*/React.createElement("div", {
    className: "bk-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-secondary ms-btn-md",
    onClick: onClose
  }, "Zatvori"), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-primary ms-btn-md",
    onClick: onComplete
  }, "Vidi termin"))));
}
window.BookingFlow = BookingFlow;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/listing/BookingFlow.jsx", error: String((e && e.message) || e) }); }

// ui_kits/listing/CityHeader.jsx
try { (() => {
function CityHeader({
  city = 'Novi Sad',
  category,
  onBack
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "ms-header"
  }, /*#__PURE__*/React.createElement("a", {
    className: "ms-logo",
    href: "../landing/index.html"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo.svg",
    alt: "Marysoll"
  })), /*#__PURE__*/React.createElement("nav", {
    className: "ms-crumbs"
  }, /*#__PURE__*/React.createElement("a", {
    href: "../landing/index.html"
  }, "Po\u010Detna"), /*#__PURE__*/React.createElement("span", null, "/"), /*#__PURE__*/React.createElement("a", {
    href: "city-listing.html"
  }, city), category && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "/"), /*#__PURE__*/React.createElement("span", {
    className: "active"
  }, category))), /*#__PURE__*/React.createElement("div", {
    className: "ms-spacer"
  }), /*#__PURE__*/React.createElement("button", {
    className: "ms-pill"
  }, /*#__PURE__*/React.createElement(MIcon.Pin, {
    width: "14",
    height: "14"
  }), " ", city, /*#__PURE__*/React.createElement(Icon.ChevronDown, {
    width: "12",
    height: "12"
  })), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-primary ms-btn-sm"
  }, "Login"));
}
window.CityHeader = CityHeader;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/listing/CityHeader.jsx", error: String((e && e.message) || e) }); }

// ui_kits/listing/FilterBar.jsx
try { (() => {
function FilterBar({
  filters,
  onFilter
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "lst-filters"
  }, /*#__PURE__*/React.createElement("button", {
    className: `lst-filter ${filters.time !== 'sve' ? 'active' : ''}`
  }, /*#__PURE__*/React.createElement(MIcon.Clock, {
    width: "14",
    height: "14"
  }), " Vreme", /*#__PURE__*/React.createElement(Icon.ChevronDown, {
    width: "12",
    height: "12"
  })), /*#__PURE__*/React.createElement("button", {
    className: `lst-filter ${filters.price !== 'sve' ? 'active' : ''}`
  }, /*#__PURE__*/React.createElement(MIcon.Wallet, {
    width: "14",
    height: "14"
  }), " Cena", /*#__PURE__*/React.createElement(Icon.ChevronDown, {
    width: "12",
    height: "12"
  })), /*#__PURE__*/React.createElement("button", {
    className: "lst-filter"
  }, /*#__PURE__*/React.createElement(MIcon.Pin, {
    width: "14",
    height: "14"
  }), " Blizina", /*#__PURE__*/React.createElement(Icon.ChevronDown, {
    width: "12",
    height: "12"
  })), /*#__PURE__*/React.createElement("button", {
    className: "lst-filter"
  }, /*#__PURE__*/React.createElement(MIcon.Star, {
    width: "14",
    height: "14"
  }), " Ocena", /*#__PURE__*/React.createElement(Icon.ChevronDown, {
    width: "12",
    height: "12"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "lst-count"
  }, filters.count, " rezultata"));
}
window.FilterBar = FilterBar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/listing/FilterBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/listing/ListingHero.jsx
try { (() => {
function ListingHero({
  city,
  category,
  count
}) {
  const isCategory = !!category;
  const h1 = isCategory ? `Slobodni termini za ${category.toLowerCase()} u ${city}` : `Slobodni termini danas u ${city}`;
  const sub = isCategory ? `Rezerviši ${category.toLowerCase()} – još ima slobodnih mesta.` : `Pronađi termin u 2 sekunde. Bez poziva, bez čekanja.`;
  return /*#__PURE__*/React.createElement("section", {
    className: "lst-hero"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms-eyebrow"
  }, /*#__PURE__*/React.createElement(MIcon.Lightning, {
    width: "12",
    height: "12"
  }), " ", count, " slobodnih termina danas"), /*#__PURE__*/React.createElement("h1", {
    className: "lst-h1"
  }, h1), /*#__PURE__*/React.createElement("p", {
    className: "lst-sub"
  }, sub));
}
window.ListingHero = ListingHero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/listing/ListingHero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/listing/SlotCard.jsx
try { (() => {
function SlotCard({
  slot,
  onBook
}) {
  return /*#__PURE__*/React.createElement("article", {
    className: "slot-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "slot-time"
  }, /*#__PURE__*/React.createElement(MIcon.Clock, {
    width: "18",
    height: "18"
  }), /*#__PURE__*/React.createElement("strong", null, slot.time)), /*#__PURE__*/React.createElement("div", {
    className: "slot-main"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "slot-service"
  }, slot.service, " ", /*#__PURE__*/React.createElement("span", null, "\xB7 ", slot.duration, " min")), /*#__PURE__*/React.createElement("div", {
    className: "slot-salon"
  }, /*#__PURE__*/React.createElement("span", {
    className: "slot-salon-name"
  }, slot.salon), /*#__PURE__*/React.createElement("span", {
    className: "slot-rating"
  }, /*#__PURE__*/React.createElement(MIcon.Star, {
    width: "14",
    height: "14"
  }), " ", slot.rating)), /*#__PURE__*/React.createElement("div", {
    className: "slot-distance"
  }, /*#__PURE__*/React.createElement(MIcon.Pin, {
    width: "14",
    height: "14"
  }), " ", slot.distance)), /*#__PURE__*/React.createElement("div", {
    className: "slot-price"
  }, /*#__PURE__*/React.createElement(MIcon.Wallet, {
    width: "16",
    height: "16"
  }), /*#__PURE__*/React.createElement("strong", null, slot.price.toLocaleString('sr-Latn'), " RSD")), /*#__PURE__*/React.createElement("div", {
    className: "slot-tags"
  }, /*#__PURE__*/React.createElement("span", {
    className: "slot-tag slot-tag-hot"
  }, /*#__PURE__*/React.createElement(MIcon.Lightning, {
    width: "12",
    height: "12"
  }), " Slobodno danas"), slot.urgency && /*#__PURE__*/React.createElement("span", {
    className: "slot-tag slot-tag-urgent"
  }, "\uD83D\uDD25 ", slot.urgency)), /*#__PURE__*/React.createElement("button", {
    className: "ms-btn ms-btn-primary ms-btn-md slot-cta",
    onClick: () => onBook(slot)
  }, "Rezervi\u0161i ", /*#__PURE__*/React.createElement(MIcon.ArrowRight, {
    width: "14",
    height: "14"
  })));
}
window.SlotCard = SlotCard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/listing/SlotCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shared/Icons.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Shared icon helpers used across UI kits */
const Icon = {
  Sparkles: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
  })),
  Bolt: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M3.75 13.5 14.25 3 12 9.75h7.5L9.75 21l2.25-7.5H3.75Z"
  })),
  Calendar: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
  })),
  MapPin: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
  }), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
  })),
  Search: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
  })),
  User: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
  })),
  Sun: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
  })),
  Moon: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
  })),
  ChevronDown: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "m19.5 8.25-7.5 7.5-7.5-7.5"
  })),
  X: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M6 18 18 6M6 6l12 12"
  })),
  Send: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "1.5",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
  })),
  Check: p => /*#__PURE__*/React.createElement("svg", _extends({
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: "2",
    stroke: "currentColor"
  }, p), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "m4.5 12.75 6 6 9-13.5"
  }))
};
window.Icon = Icon;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shared/Icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shared/MIcons.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Marysoll custom monoline service icons — single color (currentColor),
   24x24 viewBox, stroke-width 1.5, rounded caps. Designed to read at 28–48px. */

const MIcon = {
  // SERVICES
  Massage: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "6",
    r: "2.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 21c1-4 4-6 7-6s6 2 7 6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 13c2-1 4-1 6 0"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15 13c2-1 4-1 6 0"
  })),
  Facial: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M12 3c4 0 7 3 7 7v3c0 4-3 7-7 7s-7-3-7-7v-3c0-4 3-7 7-7Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 11h.01M15 11h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10 15c.6.6 1.3.9 2 .9s1.4-.3 2-.9"
  })),
  Haircut: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "7",
    r: "2.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "17",
    r: "2.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 8.5 21 15"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 15.5 21 9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m13 12 8 1.5M13 12l8-1.5"
  })),
  Nails: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M9 4c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v9a3 3 0 0 1-3 3h0a3 3 0 0 1-3-3V4Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 8h6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10 19v2M14 19v2"
  })),
  Makeup: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M14 3 21 10 12 19l-7-7 9-9Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 12 3 21l9-2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 6 18 10"
  })),
  Wellness: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M12 21c-3-3-6-6-6-10a6 6 0 0 1 12 0c0 4-3 7-6 10Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8v6M9 11h6"
  })),
  // BOOKING / CALENDAR
  CalendarLarge: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "5",
    width: "18",
    height: "16",
    rx: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 10h18M8 3v4M16 3v4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "15",
    r: "1.5"
  })),
  Clock: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 7v5l3.5 2"
  })),
  Lightning: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z"
  })),
  Pin: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M12 22s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12Z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "2.5"
  })),
  Star: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7L12 3Z"
  })),
  Wallet: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "6",
    width: "18",
    height: "13",
    rx: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 10h18"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16",
    cy: "14.5",
    r: "1.2"
  })),
  Phone: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("rect", {
    x: "7",
    y: "2",
    width: "10",
    height: "20",
    rx: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M11 18h2"
  })),
  CheckCircle: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m8 12 3 3 5-6"
  })),
  ArrowRight: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M4 12h16M14 6l6 6-6 6"
  })),
  Filter: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M4 5h16l-6 8v6l-4-2v-4L4 5Z"
  }))
};
window.MIcon = MIcon;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shared/MIcons.jsx", error: String((e && e.message) || e) }); }

})();
