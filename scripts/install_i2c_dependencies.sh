#!/bin/bash
# Installation Script für PCA9685 I2C Pumpsteuerung

echo "========================================"
echo "PCA9685 I2C Pumpen-Setup"
echo "========================================"

# I2C aktivieren
echo "Aktiviere I2C-Interface..."
sudo raspi-config nonint do_i2c 0

# System aktualisieren
echo "Aktualisiere System..."
sudo apt-get update

# Python3 und pip installieren (falls nicht vorhanden)
echo "Installiere Python3 und pip..."
sudo apt-get install -y python3 python3-pip i2c-tools

# Adafruit CircuitPython Bibliotheken installieren
echo "Installiere Adafruit CircuitPython PCA9685..."
pip3 install --upgrade adafruit-python-shell
pip3 install adafruit-circuitpython-pca9685

# Optional: Systemweite Installation
echo "Installiere zusätzliche I2C Tools..."
sudo apt-get install -y python3-smbus

# I2C-Geschwindigkeit einstellen (optional, für Stabilität)
echo "Konfiguriere I2C-Geschwindigkeit..."
if ! grep -q "dtparam=i2c_arm_baudrate" /boot/config.txt; then
    echo "dtparam=i2c_arm_baudrate=100000" | sudo tee -a /boot/config.txt
fi

# Berechtigungen setzen
echo "Setze Berechtigungen für I2C..."
sudo usermod -a -G i2c $USER

echo ""
echo "========================================"
echo "Installation abgeschlossen!"
echo "========================================"
echo ""
echo "Nächste Schritte:"
echo "1. Raspberry Pi neu starten: sudo reboot"
echo "2. I2C-Adressen prüfen: sudo i2cdetect -y 1"
echo "3. Test-Skript ausführen: python3 pump_control_i2c.py test"
echo ""
echo "Hardware-Checkliste:"
echo "✓ PCA9685 Board 1 auf Adresse 0x40"
echo "✓ PCA9685 Board 2 auf Adresse 0x41"
echo "✓ SDA an Pin 3, SCL an Pin 5"
echo "✓ 3,3V und GND an beiden Boards"
echo "✓ TB6612 mit 9-12V externes Netzteil"
echo ""
