/* prefs.js - GNOME 45+ / 50 compatible */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class CryptoTickerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.crypto');

        // Page
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        // Group
        const group = new Adw.PreferencesGroup({
            title: _('Crypto Ticker Settings'),
        });
        page.add(group);

        // === Refresh Interval ===
        const refreshRow = new Adw.SpinRow({
            title: _('Refresh interval (seconds)'),
            subtitle: _('How often to update prices'),
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 3600,
                step_increment: 1,
                page_increment: 10,
            }),
        });
        settings.bind(
            'refresh-interval',
            refreshRow,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );
        group.add(refreshRow);

        // === Coins ===
        const coinsRow = new Adw.EntryRow({
            title: _('Coins (CoinGecko IDs)'),
        });
        coinsRow.set_text(settings.get_string('coins'));
        coinsRow.connect('changed', () => {
            settings.set_string('coins', coinsRow.get_text());
        });
        // Hint
        const coinsHint = new Gtk.Label({
            label: _('Example: bitcoin,ethereum,solana'),
            css_classes: ['dim-label'],
            xalign: 0,
            margin_start: 12,
            margin_end: 12,
            margin_bottom: 6,
        });
        group.add(coinsRow);
        group.add(coinsHint);

        // === Currency ===
        const currencyRow = new Adw.EntryRow({
            title: _('Fiat currency'),
        });
        currencyRow.set_text(settings.get_string('currency'));
        currencyRow.connect('changed', () => {
            settings.set_string('currency', currencyRow.get_text());
        });
        const currencyHint = new Gtk.Label({
            label: _('Example: usd, eur, vnd, jpy...'),
            css_classes: ['dim-label'],
            xalign: 0,
            margin_start: 12,
            margin_end: 12,
            margin_bottom: 6,
        });
        group.add(currencyRow);
        group.add(currencyHint);

        // === Panel position ===
        const positionOptions = ['left', 'center', 'right'];
        const positionRow = new Adw.ComboRow({
            title: _('Panel position'),
            subtitle: _('Where to show the ticker in the top bar'),
            model: new Gtk.StringList({
                strings: [_('Left'), _('Center'), _('Right')],
            }),
            selected: Math.max(0, positionOptions.indexOf(settings.get_string('panel-position'))),
        });
        positionRow.connect('notify::selected', () => {
            settings.set_string('panel-position', positionOptions[positionRow.selected]);
        });
        group.add(positionRow);
    }
}