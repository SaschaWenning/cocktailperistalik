#!/bin/bash

# CocktailBot Automatisches Installationsskript mit Kiosk-Modus (OPTIMIERT)
# ============================================================
# ÄNDERUNG: App-Dateien werden NICHT überschrieben, nur Hardware-Setup

# Farben für die Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funktion zum Anzeigen von Fortschritt
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Überprüfen, ob das Skript als Root ausgeführt wird
if [ "$EUID" -ne 0 ]; then
    print_error "Dieses Skript muss mit Root-Rechten ausgeführt werden (sudo)."
    exit 1
fi

# Begrüßung
echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}  CocktailBot Hardware-Installation (OPTIMIERT)  ${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""
echo "Dieses OPTIMIERTE Skript installiert nur die Hardware-Komponenten:"
echo ""
echo "Es werden folgende Schritte ausgeführt:"
echo "  1. System aktualisieren"
echo "  2. Erforderliche Pakete installieren"
echo "  3. Node.js auf die neueste LTS-Version aktualisieren"
echo "  4. CocktailBot-Repository klonen"
echo "  5. Abhängigkeiten installieren"
echo "  6. Python-Steuerungsskript erstellen"
echo "  7. ❌ ÜBERSPRUNGEN: cocktail-machine.ts (bleibt aktuell)"
echo "  8. ❌ ÜBERSPRUNGEN: custom-cocktails.json (bleibt aktuell)"
echo "  9. App bauen"
echo "  10. Systemd-Service erstellen und starten"
echo "  11. Kiosk-Modus einrichten"
echo "  12. Automatische Anmeldung aktivieren"
echo "  13. LCD-Treiber installieren"
echo ""
echo -e "${GREEN}✅ VORTEIL: Deine App-Features bleiben aktuell und funktionsfähig!${NC}"
echo ""
echo -e "${YELLOW}Der Installationsvorgang kann einige Minuten dauern.${NC}"
echo ""
read -p "Möchtest du fortfahren? (j/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Jj]$ ]]; then
    print_error "Installation abgebrochen."
    exit 1
fi

# Setze den Benutzer explizit auf "pi"
CURRENT_USER="pi"
print_status "Installation wird für Benutzer $CURRENT_USER durchgeführt."

# 1. System aktualisieren
print_status "Aktualisiere das System..."
apt update && apt upgrade -y
if [ $? -ne 0 ]; then
    print_error "Fehler beim Aktualisieren des Systems."
    exit 1
fi
print_success "System erfolgreich aktualisiert."

# 2. Erforderliche Pakete installieren (ohne nodejs und npm)
print_status "Installiere erforderliche Pakete..."
apt install -y git python3-pip chromium-browser unclutter xdotool
if [ $? -ne 0 ]; then
    print_warning "Es gab Probleme bei der Installation einiger Pakete. Versuche fortzufahren..."
fi
print_success "Erforderliche Pakete installiert."

# 3. Node.js und npm über NVM installieren
print_status "Installiere Node.js über NVM..."

# Entferne vorhandene Node.js-Installationen, die Konflikte verursachen könnten
apt remove -y nodejs npm
apt autoremove -y

# Installiere NVM für den pi-Benutzer
cd /home/$CURRENT_USER
if [ -d "/home/$CURRENT_USER/.nvm" ]; then
    print_warning "NVM ist bereits installiert. Aktualisiere..."
    sudo -u $CURRENT_USER bash -c "cd && source ~/.nvm/nvm.sh && nvm install --lts"
else
    print_status "Installiere NVM..."
    sudo -u $CURRENT_USER bash -c "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash"
    
    # Füge NVM zur .bashrc hinzu, falls es nicht automatisch hinzugefügt wurde
    if ! grep -q "NVM_DIR" /home/$CURRENT_USER/.bashrc; then
        cat >> /home/$CURRENT_USER/.bashrc << 'EOF'
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
EOF
    fi
    
    # Installiere Node.js LTS
    sudo -u $CURRENT_USER bash -c "source ~/.nvm/nvm.sh && nvm install --lts"
fi

# Überprüfe, ob Node.js installiert wurde
if sudo -u $CURRENT_USER bash -c "source ~/.nvm/nvm.sh && node -v" > /dev/null; then
    NODE_VERSION=$(sudo -u $CURRENT_USER bash -c "source ~/.nvm/nvm.sh && node -v")
    print_success "Node.js erfolgreich installiert: $NODE_VERSION"
else
    print_error "Fehler bei der Installation von Node.js."
    exit 1
fi

# 4. CocktailBot-Repository klonen
print_status "Klone das CocktailBot-Repository..."
cd /home/$CURRENT_USER
if [ -d "cocktailbot" ]; then
    print_warning "Das Verzeichnis 'cocktailbot' existiert bereits. Überspringe das Klonen."
else
    sudo -u $CURRENT_USER git clone https://github.com/saschawenning/cocktailbottest.git cocktailbot 
    if [ $? -ne 0 ]; then
        print_error "Fehler beim Klonen des Repositories."
        exit 1
    fi
fi
print_success "Repository erfolgreich geklont."

# 5. Abhängigkeiten installieren
print_status "Installiere Node.js-Abhängigkeiten mit --legacy-peer-deps..."
cd /home/$CURRENT_USER/cocktailbot
sudo -u $CURRENT_USER bash -c "source ~/.nvm/nvm.sh && npm install --legacy-peer-deps"
if [ $? -ne 0 ]; then
    print_warning "Es gab Probleme bei der Installation der Node.js-Abhängigkeiten. Versuche fortzufahren..."
fi
print_success "Node.js-Abhängigkeiten installiert."

print_status "Installiere Python-Abhängigkeiten..."
pip3 install RPi.GPIO
if [ $? -ne 0 ]; then
    print_warning "Es gab Probleme bei der Installation der Python-Abhängigkeiten. Versuche fortzufahren..."
fi
print_success "Python-Abhängigkeiten installiert."

# 6. Python-Steuerungsskript erstellen
print_status "Erstelle Python-Steuerungsskript..."
cat > /home/$CURRENT_USER/cocktailbot/pump_control.py << 'EOF'
#!/usr/bin/env python3
import RPi.GPIO as GPIO
import sys
import time

# Setze den GPIO-Modus
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)

def setup_pin(pin):
    # Konfiguriere den Pin als Ausgang und setze ihn auf HIGH (Relais aus)
    GPIO.setup(pin, GPIO.OUT)
    GPIO.output(pin, GPIO.HIGH)

def activate_pump(pin, duration_ms):
    try:
        # Setze den Pin auf LOW (Relais an)
        GPIO.output(pin, GPIO.LOW)
        print(f"Pumpe an Pin {pin} aktiviert für {duration_ms}ms")
        
        # Warte für die angegebene Dauer
        time.sleep(duration_ms / 1000)
        
        # Setze den Pin zurück auf HIGH (Relais aus)
        GPIO.output(pin, GPIO.HIGH)
        print(f"Pumpe an Pin {pin} deaktiviert")
        
    except Exception as e:
        print(f"Fehler: {e}")
        # Stelle sicher, dass der Pin auf HIGH gesetzt wird, auch wenn ein Fehler auftritt
        GPIO.output(pin, GPIO.HIGH)
        GPIO.cleanup()
        sys.exit(1)

def main():
    if len(sys.argv) != 4:
        print("Verwendung: python3 pump_control.py <command> <pin> <duration_ms>")
        sys.exit(1)
    
    command = sys.argv[1]
    pin = int(sys.argv[2])
    duration_ms = int(sys.argv[3])
    
    setup_pin(pin)
    
    if command == "activate":
        activate_pump(pin, duration_ms)
    else:
        print(f"Unbekannter Befehl: {command}")
        sys.exit(1)
    
    # Bereinige die GPIO-Pins
    GPIO.cleanup()

if __name__ == "__main__":
    main()
EOF

chmod +x /home/$CURRENT_USER/cocktailbot/pump_control.py
chown $CURRENT_USER:$CURRENT_USER /home/$CURRENT_USER/cocktailbot/pump_control.py
print_success "Python-Steuerungsskript erfolgreich erstellt."

print_warning "ÜBERSPRUNGEN: cocktail-machine.ts wird NICHT überschrieben (bleibt aktuell)"
print_warning "ÜBERSPRUNGEN: custom-cocktails.json wird NICHT überschrieben (bleibt aktuell)"
print_success "✅ App-Dateien bleiben aktuell und funktionsfähig!"

# 9. App bauen
print_status "Baue die App mit --legacy-peer-deps..."
cd /home/$CURRENT_USER/cocktailbot
sudo -u $CURRENT_USER bash -c "source ~/.nvm/nvm.sh && npm run build --legacy-peer-deps"
if [ $? -ne 0 ]; then
    print_warning "Es gab Probleme beim Bauen der App. Versuche fortzufahren..."
fi
print_success "App gebaut."

# 10. Systemd-Service erstellen und starten
print_status "Erstelle Systemd-Service..."
cat > /etc/systemd/system/cocktailbot.service << EOF
[Unit]
Description=CocktailBot Service
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=/home/$CURRENT_USER/cocktailbot
ExecStart=/bin/bash -c 'cd /home/$CURRENT_USER/cocktailbot && source ~/.nvm/nvm.sh && npm start'
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=cocktailbot

[Install]
WantedBy=multi-user.target
EOF

print_status "Aktiviere und starte den Service..."
systemctl daemon-reload
systemctl enable cocktailbot.service
systemctl start cocktailbot.service
if [ $? -ne 0 ]; then
    print_warning "Es gab Probleme beim Starten des Services. Versuche fortzufahren..."
fi
print_success "Service gestartet."

# 11. Kiosk-Modus einrichten
print_status "Richte Kiosk-Modus ein..."

# Erstelle das Kiosk-Skript
cat > /home/$CURRENT_USER/kiosk.sh << 'EOF'
#!/bin/bash

LOGFILE="/home/pi/kiosk.log"
echo "$(date): kiosk.sh gestartet" >> "$LOGFILE"

# Warte, bis das Netzwerk verfügbar ist
sleep 30

# Versuche, Bildschirmschoner und Energiesparfunktionen zu deaktivieren
if command -v xset &> /dev/null; then
    xset s off
    xset s noblank
    xset -dpms
fi

# Verstecke den Mauszeiger nach 5 Sekunden Inaktivität
if command -v unclutter &> /dev/null; then
    unclutter -idle 5 &
fi

# Halte das Skript am Laufen, um den Browser bei Abstürzen neu zu starten
chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:3000 --disable-translate --disable-features=TranslateUI --disable-session-crashed-bubble --disable-features=RendererCodeIntegrity --disable-pinch --overscroll-history-navigation=0 --check-for-update-interval=604800 &
EOF

chmod +x /home/$CURRENT_USER/kiosk.sh
chown $CURRENT_USER:$CURRENT_USER /home/$CURRENT_USER/kiosk.sh

# Erstelle den Autostart-Eintrag
mkdir -p /home/$CURRENT_USER/.config/autostart
cat > /home/$CURRENT_USER/.config/autostart/kiosk.desktop << EOF
[Desktop Entry]
Type=Application
Name=CocktailBot Kiosk
Exec=/bin/bash /home/$CURRENT_USER/kiosk.sh
X-GNOME-Autostart-enabled=true
EOF

chown -R $CURRENT_USER:$CURRENT_USER /home/$CURRENT_USER/.config/autostart

# Versuche, den Bildschirmschoner in verschiedenen Desktop-Umgebungen zu deaktivieren
# LXDE-pi
if [ -d "/etc/xdg/lxsession/LXDE-pi" ]; then
    print_status "Konfiguriere LXDE-pi Autostart..."
    
    # Erstelle oder aktualisiere die Autostart-Datei
    if [ -f "/etc/xdg/lxsession/LXDE-pi/autostart" ]; then
        # Datei existiert, füge Einträge hinzu oder ersetze sie
        sed -i 's/@xscreensaver -no-splash/@xset s off\n@xset -dpms\n@xset s noblank/' /etc/xdg/lxsession/LXDE-pi/autostart
        
        # Prüfe, ob das Kiosk-Skript bereits in der Autostart-Datei ist
        if ! grep -q "@/bin/bash /home/$CURRENT_USER/kiosk.sh" /etc/xdg/lxsession/LXDE-pi/autostart; then
            echo "@/bin/bash /home/$CURRENT_USER/kiosk.sh" >> /etc/xdg/lxsession/LXDE-pi/autostart
        fi
    else
        # Datei existiert nicht, erstelle sie
        mkdir -p /etc/xdg/lxsession/LXDE-pi
        cat > /etc/xdg/lxsession/LXDE-pi/autostart << EOF
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xset s off
@xset -dpms
@xset s noblank
@/bin/bash /home/$CURRENT_USER/kiosk.sh
EOF
    fi
fi

# Konfiguriere LightDM
if [ -f "/etc/lightdm/lightdm.conf" ]; then
    print_status "Konfiguriere LightDM..."
    
    # Prüfe, ob der Abschnitt [SeatDefaults] oder [Seat:*] existiert
    if grep -q "\[SeatDefaults\]" /etc/lightdm/lightdm.conf; then
        SECTION="SeatDefaults"
    elif grep -q "\[Seat:\*\]" /etc/lightdm/lightdm.conf; then
        SECTION="Seat:*"
    else
        # Füge den Abschnitt [Seat:*] hinzu
        echo -e "\n[Seat:*]" >> /etc/lightdm/lightdm.conf
        SECTION="Seat:*"
    fi
    
    # Füge die xserver-command-Zeile hinzu, wenn sie nicht existiert
    if ! grep -q "xserver-command=X -s 0 -dpms" /etc/lightdm/lightdm.conf; then
        sed -i "/\[$SECTION\]/a xserver-command=X -s 0 -dpms" /etc/lightdm/lightdm.conf
    fi
fi

print_success "Kiosk-Modus erfolgreich eingerichtet."

# 12. Automatische Anmeldung aktivieren
print_status "Aktiviere automatische Anmeldung..."

# Prüfe, ob raspi-config verfügbar ist
if command -v raspi-config > /dev/null; then
    # Verwende raspi-config, um die automatische Anmeldung zu aktivieren
    raspi-config nonint do_boot_behaviour B4
    print_success "Automatische Anmeldung aktiviert."
else
    # Alternativ: Konfiguriere LightDM für automatische Anmeldung
    if [ -f "/etc/lightdm/lightdm.conf" ]; then
        # Finde den richtigen Abschnitt
        if grep -q "\[SeatDefaults\]" /etc/lightdm/lightdm.conf; then
            SECTION="SeatDefaults"
        elif grep -q "\[Seat:\*\]" /etc/lightdm/lightdm.conf; then
            SECTION="Seat:*"
        else
            # Füge den Abschnitt [Seat:*] hinzu
            echo -e "\n[Seat:*]" >> /etc/lightdm/lightdm.conf
            SECTION="Seat:*"
        fi
        
        # Konfiguriere automatische Anmeldung
        sed -i "/\[$SECTION\]/a autologin-user=$CURRENT_USER" /etc/lightdm/lightdm.conf
        sed -i "/\[$SECTION\]/a autologin-user-timeout=0" /etc/lightdm/lightdm.conf
        print_success "Automatische Anmeldung über LightDM konfiguriert."
    else
        print_warning "Konnte automatische Anmeldung nicht konfigurieren. Bitte manuell einrichten."
    fi
fi

# 13. Füge den Benutzer zur gpio-Gruppe hinzu
print_status "Füge Benutzer zur gpio-Gruppe hinzu..."
usermod -a -G gpio $CURRENT_USER
print_success "Benutzer zur gpio-Gruppe hinzugefügt."

# 14. Aktiviere die GPIO-Schnittstelle
print_status "Aktiviere die GPIO-Schnittstelle..."
if command -v raspi-config > /dev/null; then
    raspi-config nonint do_spi 0
    print_success "GPIO-Schnittstelle aktiviert."
else
    print_warning "raspi-config nicht gefunden. Bitte aktiviere die GPIO-Schnittstelle manuell."
fi

# ============================================================
# ZUSATZ: LCD-Treiber installieren & Bootzeit optimieren
# ============================================================

print_status "Installiere LCD-Treiber (GoodTFT)..."
cd /home/$CURRENT_USER
rm -rf LCD-show
sudo -u $CURRENT_USER git clone https://github.com/goodtft/LCD-show.git
cd LCD-show
chmod +x LCD7C-show

# Reboot verhindern im Skript:
sed -i 's/sudo reboot/# sudo reboot/g' LCD7C-show
sudo ./LCD7C-show
print_success "LCD-Treiber installiert."

# Plymouth entfernen
print_status "Entferne Plymouth..."
apt purge -y plymouth plymouth-label plymouth-themes rpd-plym-splash || true

# cmdline.txt bereinigen
print_status "Bereinige /boot/firmware/cmdline.txt..."
CMDLINE_FILE="/boot/firmware/cmdline.txt"
sed -i.bak -E 's/\bquiet\b//g; s/\bsplash\b//g; s/\s+/ /g' $CMDLINE_FILE

# NetworkManager-wait-online deaktivieren
print_status "Deaktiviere NetworkManager-Wartezeit..."
systemctl disable NetworkManager-wait-online.service

# /dev/dri/card0 und renderD128 maskieren
print_status "Maskiere nicht vorhandene Grafikgeräte..."
systemctl mask dev-dri-card0.device
systemctl mask dev-dri-renderD128.device

# Displaykonfiguration absichern (1024x600)
print_status "Setze HDMI-Displayauflösung auf 1024x600..."
grep -q "hdmi_cvt 1024 600 60" /boot/config.txt || cat >> /boot/config.txt <<EOF

# --- LCD Setup ---
hdmi_force_hotplug=1
dtparam=i2c_arm=on
dtparam=spi=on
enable_uart=1
display_rotate=0
max_usb_current=1
config_hdmi_boost=7
hdmi_group=2
hdmi_mode=87
hdmi_drive=1
hdmi_cvt 1024 600 60 6 0 0 0
EOF

print_success "LCD-Treiber & Bootoptimierung abgeschlossen."

# Hinweis zur Sichtbarkeit
echo "\n\033[1;32mLCD-Treiber + Bootoptimierung abgeschlossen. Bitte starte den Pi neu.\033[0m"
echo "\033[1;33mTipp: sudo systemctl status dev-dri-card0.device\033[0m sollte jetzt \"masked\" zeigen."

# Optionaler Reboot
read -p "\n🔁 Jetzt neustarten? (j/n): " restart
if [[ "$restart" =~ ^[Jj]$ ]]; then
  reboot
else
  echo "⏳ Du kannst später manuell mit 'sudo reboot' neustarten."
fi

# Abschluss
IP_ADDRESS=$(hostname -I | awk '{print $1}')
echo -e "${GREEN}=================================================${NC}"
echo -e "${GREEN}  CocktailBot Hardware-Installation abgeschlossen!  ${NC}"
echo -e "${GREEN}=================================================${NC}"
echo ""
echo "Der CocktailBot wurde erfolgreich installiert und läuft jetzt als Systemd-Service."
echo "Der Kiosk-Modus wurde eingerichtet und wird beim nächsten Neustart automatisch starten."
echo ""
echo -e "${GREEN}✅ VORTEIL: Deine App-Features (Hidden Cocktails, Füllstände, etc.) bleiben funktionsfähig!${NC}"
echo ""
echo "Du kannst auf die Weboberfläche zugreifen unter:"
echo -e "${BLUE}http://$IP_ADDRESS:3000${NC}"
echo ""
echo "Nützliche Befehle:"
echo "  - Service-Status anzeigen: ${YELLOW}sudo systemctl status cocktailbot.service${NC}"
echo "  - Logs anzeigen: ${YELLOW}sudo journalctl -u cocktailbot.service -f${NC}"
echo "  - Service neustarten: ${YELLOW}sudo systemctl restart cocktailbot.service${NC}"
echo ""
echo "Bitte starte den Raspberry Pi neu, um den Kiosk-Modus zu aktivieren:"
echo -e "${YELLOW}sudo reboot${NC}"
echo ""
echo "Viel Spaß mit deinem CocktailBot!"
exit 0
