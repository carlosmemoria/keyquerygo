# Validation — v0.1.0
- Nine unit tests passed for case handling, editable fields, timeout, modifiers, per-step conflicts, prefixes and URL encoding.
- JavaScript syntax, manifest paths and shortcut JSON validated.
- Loaded unpacked extension in isolated Chrome for Testing 154 on Debian.
- Settings UI rendered; visual keyboard modifier and Ctrl+GO warnings verified with DOM interactions.
- Destination saved and persisted after reload.
- Google overlay opened using synthetic keyboard events on a local fixture; plain triggers did not open inside an input.
- Background search opened a new Google tab with the encoded query; Google returned its verification page.
- Settings screenshot inspected; file input hiding and platform selector corrected.
- Physical keyboard combinations, Firefox, other OS environments, import/export file dialogs and Chrome Web Store submission still need user testing.
