### Overview
Below is a complete GNOME Shell extension that shows **BTC, ETH and other crypto prices** in the top bar as **left-to-right moving text**, with **coloring based on 24h% change** and a **configurable refresh interval (seconds)**. It fetches prices from CoinGecko (free public API), parses the 24h change, and animates the text using CSS. The extension is written for GNOME Shell using GJS.

---

### Installation steps
1. Create extension folder:
   ```bash
   mkdir -p ~/.local/share/gnome-shell/extensions/crypto-ticker@yourname
   ```
2. Put the files above into that folder, and create a `schemas/` subfolder with the `org.gnome.shell.extensions.crypto.gschema.xml`.
3. Compile schemas:
   ```bash
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/crypto-ticker@yourname/schemas
   ```
4. Restart GNOME Shell (press `Alt+F2`, type `r`, Enter) or log out/in.
5. Enable the extension via **Extensions** app or **GNOME Tweaks**.
6. Open the extension preferences to set **refresh interval** and **coins**.

---

### Example configuration and display
- **Coins**: `bitcoin,ethereum,cardano`
- **Refresh interval**: `20` seconds
- Displayed text example:
  ```
  BTC: $65,432.12 (+0.05%)  |  ETH: $2,123.45 (-1.12%)  |  ADA: $0.45 (+2.34%)
  ```
- Colors: **green** for positive 24h change, **red** for negative, **yellow** for exactly 0, **white** if unknown.

---

### Implementation notes and tips
- **API limits**: CoinGecko has rate limits; avoid very small refresh intervals for many coins.
- **CoinGecko coin ids**: Use CoinGecko ids (e.g., `bitcoin`, `ethereum`, `tether`). You can find ids on CoinGecko site.
- **Security**: This extension uses HTTPS; no API key required for CoinGecko public endpoints.
- **Compatibility**: The `shell-version` in `metadata.json` may need adjustment for your GNOME Shell version.
- **Styling**: You can tweak `stylesheet.css` to change font size, weight, or animation timing curve.
- **Animation tuning**: The code sets `animation-duration` inline on the `.moving-text` element; adjust the heuristic in `_updateLabel` to change speed.

---

If you want, I can:
- Add **icons** next to each coin symbol,
- Add a **popup menu** with detailed info on click,
- Or convert the animation to **continuous marquee** using a different approach for smoother looping.

Tell me which enhancement you prefer and I’ll provide the updated code.

### Debug

```sh
journalctl -f -o cat /usr/bin/gnome-shell

sudo dnf install -y mutter-devkit
gnome-extensions disable crypto-ticker@yourname
gnome-extensions enable crypto-ticker@yourname
```