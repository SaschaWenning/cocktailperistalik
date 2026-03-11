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
