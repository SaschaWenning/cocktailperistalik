#!/usr/bin/env python3
"""
CocktailBot Pumpensteuerung
PCA9685 (I2C) + TB6612 Motortreiber

Hardware-Layout:
  pca_in1 (0x40)  → IN1-Signale aller 16 Pumpen  (Kanal 0-15)
  pca_in2 (0x50)  → IN2-Signale aller 16 Pumpen  (Kanal 0-15)
  pca_pwm (0x60)  → PWM-Signale aller 16 Pumpen  (Kanal 0-15)

TB6612 Wahrheitstabelle:
  IN1=LOW,  IN2=LOW  → Freilauf (Stop)
  IN1=HIGH, IN2=LOW  → Rückwärts (reverse)
  IN1=LOW,  IN2=HIGH → Vorwärts  (forward)
  IN1=HIGH, IN2=HIGH → Bremse    (brake)

Raspberry Pi 5:
  Pin 3 (GPIO2) → SDA
  Pin 5 (GPIO3) → SCL
  Pin 1/17      → 3,3 V Logikversorgung
  GND           → gemeinsame Masse
"""

import sys
import time
import json

# I2C-Adressen der drei PCA9685-Boards
PCA_IN1_ADDR = 0x40   # Board für IN1-Signale
PCA_IN2_ADDR = 0x50   # Board für IN2-Signale
PCA_PWM_ADDR = 0x60   # Board für PWM-Signale

# PWM-Frequenz (Hz) – muss auf allen drei Boards gleich sein
PWM_FREQUENCY = 200

# Vollständiger Duty-Cycle (entspricht HIGH / 100 %)
DUTY_FULL = 0xFFFF
DUTY_OFF  = 0x0000

try:
    import board
    import busio
    from adafruit_pca9685 import PCA9685
    HW_AVAILABLE = True
except ImportError as e:
    HW_AVAILABLE = False
    IMPORT_ERROR = str(e)


class PumpController:
    """Steuert 16 Pumpen über drei PCA9685-Boards und TB6612-Motortreiber."""

    def __init__(self, stop_on_init: bool = True):
        if not HW_AVAILABLE:
            raise RuntimeError(
                f"Fehlende Bibliothek: {IMPORT_ERROR}. "
                "Installieren Sie: pip3 install adafruit-circuitpython-pca9685"
            )

        # I2C-Bus initialisieren (Raspberry Pi 5: Pin 3=SDA, Pin 5=SCL)
        i2c = busio.I2C(board.SCL, board.SDA)

        # Drei PCA9685-Boards initialisieren
        self.pca_in1 = PCA9685(i2c, address=PCA_IN1_ADDR)
        self.pca_in2 = PCA9685(i2c, address=PCA_IN2_ADDR)
        self.pca_pwm = PCA9685(i2c, address=PCA_PWM_ADDR)

        # Frequenz auf allen Boards setzen
        self.pca_in1.frequency = PWM_FREQUENCY
        self.pca_in2.frequency = PWM_FREQUENCY
        self.pca_pwm.frequency = PWM_FREQUENCY

        # Beim Start alle Pumpen sicher stoppen (nur wenn gewünscht)
        if stop_on_init:
            self.stop_all()

    # ------------------------------------------------------------------
    # Interne Hilfsmethoden
    # ------------------------------------------------------------------

    def _validate_pump(self, pump_id: int) -> int:
        """Gibt den 0-basierten Kanal zurück (pump_id 1-16 → Kanal 0-15)."""
        if not 1 <= pump_id <= 16:
            raise ValueError(f"pump_id muss zwischen 1 und 16 liegen, erhalten: {pump_id}")
        return pump_id - 1

    @staticmethod
    def _speed_to_duty(speed_percent: float) -> int:
        """Wandelt Geschwindigkeit (0-100 %) in Duty-Cycle (0x0000-0xFFFF) um."""
        speed_percent = max(0.0, min(100.0, speed_percent))
        return int((speed_percent / 100.0) * DUTY_FULL)

    # ------------------------------------------------------------------
    # Öffentliche Pumpen-API
    # ------------------------------------------------------------------

    def stop(self, pump_id: int) -> None:
        """Stoppt eine einzelne Pumpe (Freilauf)."""
        ch = self._validate_pump(pump_id)
        self.pca_pwm.channels[ch].duty_cycle = DUTY_OFF
        self.pca_in1.channels[ch].duty_cycle = DUTY_OFF
        self.pca_in2.channels[ch].duty_cycle = DUTY_OFF

    def stop_all(self) -> dict:
        """Stoppt alle 16 Pumpen sofort."""
        for ch in range(16):
            self.pca_pwm.channels[ch].duty_cycle = DUTY_OFF
            self.pca_in1.channels[ch].duty_cycle = DUTY_OFF
            self.pca_in2.channels[ch].duty_cycle = DUTY_OFF
        return {"success": True, "message": "Alle Pumpen gestoppt"}

    def forward(self, pump_id: int, speed_percent: float = 100.0) -> None:
        """Startet eine Pumpe in Vorwärtsrichtung mit gegebener Geschwindigkeit."""
        ch = self._validate_pump(pump_id)
        duty = self._speed_to_duty(speed_percent)

        # 1) sauber stoppen
        self.stop(pump_id)
        time.sleep(0.5)

        # 2) beide Richtungen sicher LOW lassen
        self.pca_in1.channels[ch].duty_cycle = DUTY_OFF
        self.pca_in2.channels[ch].duty_cycle = DUTY_OFF
        time.sleep(0.5)

        # 3) Vorwärtsrichtung setzen: IN1=LOW, IN2=HIGH
        self.pca_in1.channels[ch].duty_cycle = DUTY_OFF
        self.pca_in2.channels[ch].duty_cycle = DUTY_FULL
        time.sleep(0.5)

        # 4) PWM aktivieren
        self.pca_pwm.channels[ch].duty_cycle = duty

    def reverse(self, pump_id: int, speed_percent: float = 100.0) -> None:
        """Startet eine Pumpe in Rückwärtsrichtung (Rückspülen/Entleeren)."""
        ch = self._validate_pump(pump_id)
        duty = self._speed_to_duty(speed_percent)

        # 1) sauber stoppen
        self.stop(pump_id)
        time.sleep(0.5)

        # 2) beide Richtungen sicher LOW lassen
        self.pca_in1.channels[ch].duty_cycle = DUTY_OFF
        self.pca_in2.channels[ch].duty_cycle = DUTY_OFF
        time.sleep(0.5)

        # 3) Rückwärtsrichtung setzen: IN1=HIGH, IN2=LOW
        self.pca_in1.channels[ch].duty_cycle = DUTY_FULL
        self.pca_in2.channels[ch].duty_cycle = DUTY_OFF
        time.sleep(0.5)

        # 4) PWM aktivieren
        self.pca_pwm.channels[ch].duty_cycle = duty

    def activate_multi(self, pumps: list) -> dict:
        """
        Aktiviert mehrere Pumpen gleichzeitig und stoppt sie nach ihrer jeweiligen Laufzeit.

        Args:
            pumps: Liste von dicts mit:
                   - pump_id (int, 1-16)
                   - duration_ms (float)
                   - direction ('forward' | 'reverse')
                   - speed_percent (float, 0-100)
                   - start_delay_ms (float, optionaler gestaffelter Start)

        Returns:
            dict mit 'success' und Ergebnis-Liste
        """
        if not pumps:
            return {"success": True, "message": "Keine Pumpen angegeben", "pumps": []}

        # Startzeit BEVOR irgendwas passiert
        start_time = time.monotonic()

        # Alle Pumpen starten: mit start_delay gestaffelt
        for entry in pumps:
            pump_id      = int(entry["pump_id"])
            direction    = entry.get("direction", "forward")
            speed_pct    = float(entry.get("speed_percent", 100.0))
            start_delay  = float(entry.get("start_delay_ms", 0))

            # Warte bis zum geplanten Startzeitpunkt
            target_start = start_delay / 1000.0
            elapsed = time.monotonic() - start_time
            if target_start > elapsed:
                time.sleep(target_start - elapsed)

            if direction == "reverse":
                self.reverse(pump_id, speed_pct)
            else:
                self.forward(pump_id, speed_pct)

        # Jede Pumpe zur richtigen Zeit stoppen (sortiert nach Endzeit)
        sorted_pumps = sorted(
            pumps,
            key=lambda p: float(p.get("start_delay_ms", 0)) + float(p["duration_ms"])
        )
        for entry in sorted_pumps:
            pump_id     = int(entry["pump_id"])
            duration_ms = float(entry["duration_ms"])
            start_delay = float(entry.get("start_delay_ms", 0))
            end_time    = (start_delay + duration_ms) / 1000.0
            elapsed     = time.monotonic() - start_time
            remaining   = end_time - elapsed
            if remaining > 0:
                time.sleep(remaining)
            self.stop(pump_id)

        results = [
            {
                "pump_id": int(p["pump_id"]),
                "duration_ms": float(p["duration_ms"]),
                "direction": p.get("direction", "forward"),
            }
            for p in pumps
        ]
        return {"success": True, "pumps": results}

    def activate_pump(
        self,
        pump_id: int,
        duration_ms: float,
        direction: str = "forward",
        speed_percent: float = 100.0,
    ) -> dict:
        """
        Aktiviert eine Pumpe für eine definierte Zeitdauer und stoppt sie dann.

        Args:
            pump_id:       Pumpen-ID (1-16)
            duration_ms:   Laufzeit in Millisekunden
            direction:     'forward' oder 'reverse'
            speed_percent: Geschwindigkeit 0-100 %

        Returns:
            dict mit 'success' und Metadaten
        """
        if duration_ms <= 0:
            raise ValueError(f"duration_ms muss > 0 sein, erhalten: {duration_ms}")

        try:
            if direction == "reverse":
                self.reverse(pump_id, speed_percent)
            else:
                self.forward(pump_id, speed_percent)

            time.sleep(duration_ms / 1000.0)
            self.stop(pump_id)

            return {
                "success": True,
                "pump_id": pump_id,
                "duration_ms": duration_ms,
                "direction": direction,
                "speed_percent": speed_percent,
            }
        except Exception as exc:
            # Im Fehlerfall Pumpe sicherheitshalber stoppen
            try:
                self.stop(pump_id)
            except Exception:
                pass
            raise exc

    def cleanup(self) -> dict:
        """Stoppt alle Pumpen und gibt die I2C-Ressourcen frei."""
        self.stop_all()
        self.pca_in1.deinit()
        self.pca_in2.deinit()
        self.pca_pwm.deinit()
        return {"success": True, "message": "Cleanup erfolgreich"}


# ----------------------------------------------------------------------
# Kommandozeilen-Interface (wird vom Next.js-Server aufgerufen)
# ----------------------------------------------------------------------

def _ok(data: dict) -> None:
    print(json.dumps(data))

def _err(msg: str) -> None:
    print(json.dumps({"success": False, "error": msg}))
    sys.exit(1)


def main() -> None:
    if len(sys.argv) < 2:
        _err(
            "Keine Aktion angegeben.\n"
            "Verwendung: python3 pump_control_i2c.py <action> [args]\n"
            "Aktionen: activate, stop, cleanup, test"
        )

    action = sys.argv[1]

    try:
        # KEIN stop_all beim Init - wird nur bei cleanup/stop explizit aufgerufen
        controller = PumpController(stop_on_init=False)
    except Exception as exc:
        _err(str(exc))
        return

    try:
        # ----------------------------------------------------------
        # activate <pump_id> <duration_ms> [direction] [speed_%]
        # ----------------------------------------------------------
        # ----------------------------------------------------------
        # activate_multi <json>
        # JSON: [{"pump_id":1,"duration_ms":1200,"direction":"forward","speed_percent":100,"start_delay_ms":0}, ...]
        # ----------------------------------------------------------
        if action == "activate_multi":
            if len(sys.argv) < 3:
                _err("Verwendung: python3 pump_control_i2c.py activate_multi '<json>'")
            pump_list = json.loads(sys.argv[2])
            result = controller.activate_multi(pump_list)
            _ok(result)

        # ----------------------------------------------------------
        # activate <pump_id> <duration_ms> [direction] [speed_%]
        # ----------------------------------------------------------
        elif action == "activate":
            if len(sys.argv) < 4:
                _err(
                    "Verwendung: python3 pump_control_i2c.py activate "
                    "<pump_id> <duration_ms> [forward|reverse] [speed_percent]"
                )
            pump_id      = int(sys.argv[2])
            duration_ms  = float(sys.argv[3])
            direction    = sys.argv[4] if len(sys.argv) > 4 else "forward"
            speed_pct    = float(sys.argv[5]) if len(sys.argv) > 5 else 100.0

            result = controller.activate_pump(pump_id, duration_ms, direction, speed_pct)
            _ok(result)

        # ----------------------------------------------------------
        # stop  – stoppt alle Pumpen sofort
        # ----------------------------------------------------------
        elif action == "stop":
            result = controller.stop_all()
            _ok(result)

        # ----------------------------------------------------------
        # cleanup – stoppt alle Pumpen und gibt Ressourcen frei
        # ----------------------------------------------------------
        elif action == "cleanup":
            result = controller.cleanup()
            _ok(result)

        # ----------------------------------------------------------
        # test  – fährt jede Pumpe kurz an (500 ms, 50 %)
        # ----------------------------------------------------------
        elif action == "test":
            results = []
            for pump_id in range(1, 17):
                res = controller.activate_pump(pump_id, 500, "forward", 50.0)
                results.append(res)
                time.sleep(0.5)
            _ok({"success": True, "message": "Test abgeschlossen", "pumps": results})

        else:
            _err(f"Unbekannte Aktion: '{action}'. Erlaubt: activate, stop, cleanup, test")

    except Exception as exc:
        _err(str(exc))
    finally:
        try:
            controller.stop_all()
        except Exception:
            pass


if __name__ == "__main__":
    main()
