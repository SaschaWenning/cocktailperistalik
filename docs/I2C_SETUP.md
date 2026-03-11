# PCA9685 + TB6612 Setup für Cocktailmaschine

## Hardware-Übersicht

### Komponenten
- **Raspberry Pi 5**
- **2x PCA9685 PWM-Treiberplatinen** (16 Kanäle je Board)
- **16x TB6612 Motortreiber** (oder andere H-Bridge-Motortreiber)
- **16x Peristaltikpumpen** (9-12V DC Motoren)
- **Externes 9-12V Netzteil** für Pumpen

### Raspberry Pi 5 Pinbelegung

| Pin | Funktion | Verbindung |
|-----|----------|------------|
| Pin 1 | 3,3V | Logikversorgung (PCA9685 VCC) |
| Pin 3 | SDA | I2C Daten (beide PCA9685) |
| Pin 5 | SCL | I2C Takt (beide PCA9685) |
| Pin 6 | GND | Gemeinsame Masse |
| Pin 17 | 3,3V | Zusätzliche Logikversorgung (optional) |

### I2C-Adressen

- **PCA9685 Board 1:** `0x40` (Pumpen 1-8)
- **PCA9685 Board 2:** `0x41` (Pumpen 9-16)

**Hinweis:** Die I2C-Adresse kann über Lötbrücken auf dem PCA9685-Board geändert werden.

## Verkabelung

### PCA9685 zu Raspberry Pi

Beide PCA9685-Boards werden parallel an den I2C-Bus angeschlossen:

\`\`\`
Raspberry Pi          PCA9685 Board 1 & 2
─────────────────────────────────────────
Pin 3 (SDA)    ────┬──→ SDA
Pin 5 (SCL)    ────┼──→ SCL
Pin 1 (3,3V)   ────┼──→ VCC
Pin 6 (GND)    ────┴──→ GND
\`\`\`

### PCA9685 zu TB6612 Motortreiber

Jede Pumpe benötigt **2 PWM-Kanäle** für die Richtungssteuerung (IN1, IN2):

#### Pumpen 1-8 (PCA9685 Board 1)
| Pumpe | PCA9685 Kanäle | TB6612 Pins |
|-------|----------------|-------------|
| Pumpe 1 | Kanal 0 (IN1), Kanal 1 (IN2) | AIN1, AIN2 |
| Pumpe 2 | Kanal 2 (IN1), Kanal 3 (IN2) | BIN1, BIN2 |
| Pumpe 3 | Kanal 4 (IN1), Kanal 5 (IN2) | AIN1, AIN2 |
| ... | ... | ... |
| Pumpe 8 | Kanal 14 (IN1), Kanal 15 (IN2) | BIN1, BIN2 |

#### Pumpen 9-16 (PCA9685 Board 2)
| Pumpe | PCA9685 Kanäle | TB6612 Pins |
|-------|----------------|-------------|
| Pumpe 9 | Kanal 0 (IN1), Kanal 1 (IN2) | AIN1, AIN2 |
| Pumpe 10 | Kanal 2 (IN1), Kanal 3 (IN2) | BIN1, BIN2 |
| ... | ... | ... |
| Pumpe 16 | Kanal 14 (IN1), Kanal 15 (IN2) | BIN1, BIN2 |

### TB6612 zu Pumpen

\`\`\`
TB6612                  Pumpe
─────────────────────────────
VM (Motor Power) ←─── 9-12V Netzteil
AO1, AO2        ────→ Pumpenmotor
GND             ────→ Gemeinsame Masse
\`\`\`

## Software-Installation

### 1. I2C aktivieren

\`\`\`bash
sudo raspi-config
# Interface Options → I2C → Enable
\`\`\`

### 2. Python-Bibliotheken installieren

\`\`\`bash
# Systemabhängigkeiten
sudo apt-get update
sudo apt-get install -y python3-pip i2c-tools

# Adafruit PCA9685 Bibliothek
pip3 install adafruit-circuitpython-pca9685

# Alternative (falls benötigt):
sudo apt-get install -y python3-smbus
\`\`\`

### 3. I2C-Adressen überprüfen

\`\`\`bash
sudo i2cdetect -y 1
\`\`\`

Erwartete Ausgabe:
\`\`\`
     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f
00:          -- -- -- -- -- -- -- -- -- -- -- -- --
10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
20: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
30: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
40: 40 41 -- -- -- -- -- -- -- -- -- -- -- -- -- --
50: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
60: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
70: -- -- -- -- -- -- -- --
\`\`\`

Hier sehen Sie `40` (Board 1) und `41` (Board 2).

## Verwendung

### Python-Skript testen

\`\`\`bash
# Setup (alle Pumpen initialisieren und stoppen)
python3 pump_control_i2c.py setup

# Pumpe aktivieren (Vorwärts, 100% Geschwindigkeit)
python3 pump_control_i2c.py activate 1 3000 forward 100

# Pumpe rückwärts laufen lassen (für Reinigung)
python3 pump_control_i2c.py activate 1 5000 reverse 100

# Pumpe mit 50% Geschwindigkeit
python3 pump_control_i2c.py activate 5 2000 forward 50

# Alle Pumpen stoppen
python3 pump_control_i2c.py stop

# Test-Modus (alle 16 Pumpen kurz testen)
python3 pump_control_i2c.py test
\`\`\`

### TB6612 Richtungssteuerung

Das System steuert die Motoren über TB6612 H-Bridge:

| IN1 | IN2 | Motor-Verhalten |
|-----|-----|-----------------|
| LOW | LOW | Stop (Freilauf) |
| HIGH | LOW | **Vorwärts** (Pumpen) |
| LOW | HIGH | **Rückwärts** (Rückspülung) |
| HIGH | HIGH | Brake (Kurzschluss-Bremse) |

## Fehlerbehebung

### I2C-Fehler "Remote I/O error"

\`\`\`bash
# I2C-Bus-Geschwindigkeit reduzieren (in /boot/config.txt)
sudo nano /boot/config.txt

# Füge hinzu:
dtparam=i2c_arm=on
dtparam=i2c_arm_baudrate=100000

# Neustart
sudo reboot
\`\`\`

### Pumpe läuft nicht

1. **Stromversorgung prüfen:** TB6612 VM muss 9-12V haben
2. **Verkabelung prüfen:** PCA9685 PWM-Ausgang zu TB6612 IN1/IN2
3. **I2C-Adresse prüfen:** `sudo i2cdetect -y 1`
4. **Python-Bibliothek:** `pip3 list | grep adafruit`

### PWM-Frequenz anpassen

Falls Pumpen "brummen" oder nicht sauber laufen:

\`\`\`python
# In pump_control_i2c.py, Zeile 18:
PWM_FREQUENCY = 1000  # Standard
# Versuchen Sie: 500, 1000, 1500, 2000 Hz
\`\`\`

## Sicherheitshinweise

⚠️ **WICHTIG:**
- Externe Stromversorgung (9-12V) von Raspberry Pi trennen
- Gemeinsame Masse zwischen Pi, PCA9685, TB6612 und Netzteil
- Niemals Motorspannung (>5V) direkt an Pi-Pins anlegen
- Not-Aus-Funktion: `python3 pump_control_i2c.py stop`

## Migration von altem GPIO-System

Das alte System verwendete direkte GPIO-Pins. Das neue System verwendet:

- ✅ **I2C statt GPIO** → Nur 2 Pins (SDA, SCL) für 16 Pumpen
- ✅ **PWM-Steuerung** → Variable Geschwindigkeit (0-100%)
- ✅ **Richtungssteuerung** → Vorwärts/Rückwärts für Reinigung
- ✅ **Pump-ID statt Pin-Nummer** → `pump.id` (1-16)

Alte Konfiguration:
\`\`\`typescript
{ id: 1, pin: 17, ingredient: "vodka", ... }
\`\`\`

Neue Konfiguration:
\`\`\`typescript
{ id: 1, ingredient: "vodka", ... }  // pin entfernt
