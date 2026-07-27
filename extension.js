/* extension.js - GNOME 45+ / 50 compatible Crypto Ticker with Marquee */

import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';
import Pango from 'gi://Pango';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const SETTINGS_SCHEMA = 'org.gnome.shell.extensions.crypto';

const CryptoTicker = GObject.registerClass(
class CryptoTicker extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, 'Crypto Ticker', false);

        this._extension = extension;
        this.settings = extension.getSettings(SETTINGS_SCHEMA);

        // Container bị cắt cứng
        this.container = new St.BoxLayout({
            style_class: 'moving-container',
            x_expand: false,
            x_align: Clutter.ActorAlign.START,
        });
        this.container.set_width(280);               // độ rộng hiển thị
        this.container.clip_to_allocation = true;    // bắt buộc phải có
        this.add_child(this.container);

        this.marquee = new St.BoxLayout({
            style_class: 'moving-text',
            vertical: false,
        });
        this.container.add_child(this.marquee);

        this._session = new Soup.Session();

        this._timeoutId = 0;
        this._settingsChangedId = 0;
        this._animTimeoutId = 0;
        this._scrollPos = 0;

        this._applySettings();
        this._refresh();

        this._settingsChangedId = this.settings.connect('changed', () => {
            this._applySettings();
        });
    }

    _applySettings() {
        this.refreshInterval = Math.max(5, this.settings.get_int('refresh-interval'));
        this.coins = this.settings.get_string('coins')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        this.currency = this.settings.get_string('currency') || 'usd';

        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }

        this._timeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            this.refreshInterval,
            () => {
                this._refresh();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    _fetch(url, callback) {
        const message = Soup.Message.new('GET', url);
        message.request_headers.append('User-Agent', 'Mozilla/5.0 (GNOME Shell Extension)');
        message.request_headers.append('Accept', 'application/json');

        this._session.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null,
            (session, result) => {
                try {
                    const bytes = session.send_and_read_finish(result);
                    const decoder = new TextDecoder('utf-8');
                    const body = decoder.decode(bytes.get_data());
                    callback(null, body, message.status_code);
                } catch (e) {
                    callback(e, null, 0);
                }
            }
        );
    }

    _refresh() {
        if (!this.coins || this.coins.length === 0) {
            this._setUnknown('No coins configured');
            return;
        }

        const ids = encodeURIComponent(this.coins.join(','));
        const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${this.currency}&ids=${ids}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`;

        this._fetch(url, (err, body, status) => {
            if (err) {
                console.error(`crypto-ticker fetch error: ${err}`);
                this._setUnknown('Network error');
                return;
            }

            if (status !== 200) {
                console.error(`crypto-ticker HTTP ${status}: ${body?.substring(0, 200)}`);
                this._setUnknown(`HTTP ${status}`);
                return;
            }

            try {
                const data = JSON.parse(body);

                if (!Array.isArray(data)) {
                    console.error('crypto-ticker: response is not an array', data);
                    this._setUnknown('Invalid response');
                    return;
                }

                this._render(data);
            } catch (e) {
                console.error(`crypto-ticker parse error: ${e}`);
                console.error(`Body was: ${body?.substring(0, 300)}`);
                this._setUnknown('parse error');
            }
        });
    }

    _setUnknown(msg) {
        this._stopMarquee();
        this.marquee.destroy_all_children();

        const lbl = new St.Label({
            text: msg,
            y_align: Clutter.ActorAlign.CENTER,
        });
        lbl.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        lbl.set_style('color: #ffffff; font-weight: 600;');
        this.marquee.add_child(lbl);
    }

    _render(data) {
        this._stopMarquee();
        this.marquee.destroy_all_children();

        for (let i = 0; i < this.coins.length; i++) {
            const coinId = this.coins[i];
            const item = data.find(d => d.id.toLowerCase() === coinId.toLowerCase());

            let text, color;

            if (!item) {
                text = `${coinId.toUpperCase()}: unknown`;
                color = '#ffffff';
            } else {
                const price = item.current_price;
                const change = item.price_change_percentage_24h;
                const changeStr = (change == null)
                    ? 'unknown'
                    : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;

                text = `${item.symbol.toUpperCase()}: $${Number(price).toLocaleString(undefined, {maximumFractionDigits: 8})} (${changeStr})`;

                if (change == null) color = '#ffffff';
                else if (change > 0) color = '#2ecc71';
                else if (change < 0) color = '#e74c3c';
                else color = '#f1c40f';
            }

            const lbl = new St.Label({
                text: text,
                y_align: Clutter.ActorAlign.CENTER,
            });
            lbl.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
            lbl.set_style(`color: ${color}; font-weight: 600; margin-right: 8px;`);
            this.marquee.add_child(lbl);

            if (i < this.coins.length - 1) {
                const sep = new St.Label({
                    text: '  |  ',
                    y_align: Clutter.ActorAlign.CENTER,
                });
                sep.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
                sep.set_style('color: #ffffff;');
                this.marquee.add_child(sep);
            }
        }

        // Bắt đầu chạy chữ
        this._startMarquee();
    }

    _startMarquee() {
        this._stopMarquee();

        // Đợi layout xong rồi mới đo kích thước
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            const containerWidth = this.container.width;
            const textWidth = this.marquee.width;

            // Chỉ chạy nếu text dài hơn container
            if (textWidth <= containerWidth + 10) {
                this.marquee.translation_x = 0;
                return GLib.SOURCE_REMOVE;
            }

            // Bắt đầu từ bên phải
            this._scrollPos = containerWidth;
            this.marquee.translation_x = this._scrollPos;

            this._animTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 25, () => {
                this._scrollPos -= 1.5; // tốc độ (tăng số này = chạy nhanh hơn)

                if (this._scrollPos < -textWidth) {
                    this._scrollPos = containerWidth;
                }

                this.marquee.translation_x = this._scrollPos;
                return GLib.SOURCE_CONTINUE;
            });

            return GLib.SOURCE_REMOVE;
        });
    }

    _stopMarquee() {
        if (this._animTimeoutId) {
            GLib.source_remove(this._animTimeoutId);
            this._animTimeoutId = 0;
        }
        this.marquee.translation_x = 0;
        this._scrollPos = 0;
    }

    destroy() {
        this._stopMarquee();

        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }
        if (this._settingsChangedId) {
            this.settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = 0;
        }
        super.destroy();
    }
});

export default class CryptoTickerExtension extends Extension {
    enable() {
        this._indicator = new CryptoTicker(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator, 1, 'right');
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}