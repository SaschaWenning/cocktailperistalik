#!/usr/bin/env python3
import RPi.GPIO as GPIO
import sys
import time
import json
import os
import traceback

# Debugging-Informationen
print("Python-Skript wird ausgeführt...")
print(f"Arbeitsverzeichnis: {os.getcwd()}")
print(f"Python-Version: {sys.version}")
print(f"Argumente: {sys.argv}")

try:
    # GPIO-Modus setzen
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    print("GPIO-Modus auf BCM gesetzt")
except Exception as e:
    print(f"Fehler beim Setzen des GPIO-Modus: {str(e)}")
    print(traceback.format_exc())
    # Gib trotzdem ein JSON-Objekt zurück, damit die API-Route es parsen kann
    print(json.dumps({"success": False, "error": f"Fehler beim Setzen des GPIO-Modus: {str(e)}"}))
    sys.exit(1)

def setup_pins():
    """Alle Pins initialisieren"""
    try:
        # Versuche, die Pump-Config zu laden
        pump_config_path = os.path.join(os.getcwd(), "data", "pump-config.json")
        print(f"Suche Pump-Config unter: {pump_config_path}")
        
        if os.path.exists(pump_config_path):
            print(f"Pump-Config gefunden: {pump_config_path}")
            with open(pump_config_path, "r") as pump_config_file:
                pump_config = json.load(pump_config_file)
            
            print(f"Pump-Config geladen: {pump_config}")
            
            # Initialisiere alle Pins aus der Konfiguration
            for pump in pump_config:
                pin = pump["pin"]
                setup_pin(pin)
                # Stelle sicher, dass der Pin ausgeschaltet ist
                GPIO.output(pin, GPIO.LOW)
                print(f"Pin {pin} initialisiert und auf LOW gesetzt")
        else:
            print("Pump-Config-Datei nicht gefunden, verwende Standard-Pins")
            # Initialisiere Standard-Pins (1-28)
            for pin in range(1, 28):
                try:
                    setup_pin(pin)
                    GPIO.output(pin, GPIO.LOW)
                    print(f"Pin {pin} initialisiert und auf LOW gesetzt")
                except Exception as pin_error:
                    print(f"Fehler beim Initialisieren von Pin {pin}: {str(pin_error)}")
        
        return {"success": True, "message": "Pins erfolgreich initialisiert"}
    except Exception as e:
        print(f"Fehler beim Initialisieren der Pins: {str(e)}")
        print(traceback.format_exc())
        return {"success": False, "error": f"Fehler beim Initialisieren der Pins: {str(e)}"}

def setup_pin(pin):
    """Pin als Ausgang konfigurieren"""
    try:
        GPIO.setup(pin, GPIO.OUT)
        GPIO.output(pin, GPIO.LOW)
        print(f"Pin {pin} als Ausgang konfiguriert")
    except Exception as e:
        print(f"Fehler beim Konfigurieren von Pin {pin}: {str(e)}")
        raise

def activate_pump(pin, duration_ms):
    """Pumpe für die angegebene Zeit aktivieren"""
    try:
        print(f"Aktiviere Pumpe an Pin {pin} für {duration_ms}ms")
        
        # Pin als Ausgang konfigurieren
        setup_pin(pin)
        
        # Stelle sicher, dass der Pin ausgeschaltet ist, bevor er eingeschaltet wird
        GPIO.output(pin, GPIO.LOW)
        time.sleep(0.05)  # Kurze Verzögerung
        
        # Pumpe einschalten
        print(f"Setze Pin {pin} auf HIGH")
        GPIO.output(pin, GPIO.HIGH)
        
        # Warte für die angegebene Zeit
        time.sleep(duration_ms / 1000.0)
        
        # Pumpe ausschalten
        print(f"Setze Pin {pin} auf LOW")
        GPIO.output(pin, GPIO.LOW)
        
        return {"success": True, "message": f"Pumpe an Pin {pin} für {duration_ms}ms aktiviert"}
    except Exception as e:
        print(f"Fehler beim Aktivieren der Pumpe an Pin {pin}: {str(e)}")
        print(traceback.format_exc())
        return {"success": False, "error": f"Fehler beim Aktivieren der Pumpe an Pin {pin}: {str(e)}"}

def cleanup():
    """Alle Pins zurücksetzen"""
    try:
        print("Bereinige alle GPIO-Pins")
        GPIO.cleanup()
        return {"success": True, "message": "GPIO-Pins erfolgreich bereinigt"}
    except Exception as e:
        print(f"Fehler beim Bereinigen der GPIO-Pins: {str(e)}")
        print(traceback.format_exc())
        return {"success": False, "error": f"Fehler beim Bereinigen der GPIO-Pins: {str(e)}"}

if __name__ == "__main__":
    try:
        # Kommandozeilenargumente verarbeiten
        if len(sys.argv) < 2:
            print(json.dumps({"success": False, "error": "Keine Aktion angegeben"}))
            sys.exit(1)
        
        command = sys.argv[1]
        print(f"Führe Befehl aus: {command}")
        
        if command == "setup":
            result = setup_pins()
            print(json.dumps(result))
        
        elif command == "activate":
            if len(sys.argv) != 4:
                print(json.dumps({"success": False, "error": "Verwendung: python gpio_controller.py activate <pin> <duration_ms>"}))
                sys.exit(1)
            
            try:
                pin = int(sys.argv[2])
                duration_ms = int(sys.argv[3])
            except ValueError as e:
                print(json.dumps({"success": False, "error": f"Ungültige Parameter: {str(e)}"}))
                sys.exit(1)
                
            result = activate_pump(pin, duration_ms)
            print(json.dumps(result))
        
        elif command == "cleanup":
            result = cleanup()
            print(json.dumps(result))
        
        else:
            print(json.dumps({"success": False, "error": f"Unbekannter Befehl: {command}"}))
            sys.exit(1)
    
    except Exception as e:
        print(f"Unbehandelter Fehler: {str(e)}")
        print(traceback.format_exc())
        print(json.dumps({"success": False, "error": f"Unbehandelter Fehler: {str(e)}"}))
        sys.exit(1)
