#!/usr/bin/env python3
"""
led_client.py — sendet LED-Befehle an den Pico (USB-Seriell)

Beispiele:
  python3 led_client.py BRIGHT 64
  python3 led_client.py COLOR 0 255 0
  python3 led_client.py BUSY
  python3 led_client.py READY
  python3 led_client.py RAINBOW 30

Optional:
  python3 led_client.py --port /dev/ttyACM0 COLOR 0 120 0
  LED_PORT=/dev/ttyACM1 python3 led_client.py OFF
"""

import os
import sys
import time
import argparse
import serial
from typing import Optional

PORT_CANDIDATES = [
    "/dev/ttyLED",   # udev-Symlink (falls vorhanden)
    "/dev/ttyACM0", "/dev/ttyACM1", "/dev/ttyACM2",
    "/dev/ttyUSB0", "/dev/ttyUSB1",
]
DEFAULT_BAUD = 115200
TIMEOUT = 1.0  # s

def open_port(explicit_port: Optional[str], baud: int) -> serial.Serial:
    last_err = None
    # 1) explizit per Argument
    if explicit_port:
        try:
            return serial.Serial(explicit_port, baud, timeout=TIMEOUT)
        except Exception as e:
            last_err = e
    # 2) via Env
    env_port = os.environ.get("LED_PORT")
    if env_port:
        try:
            return serial.Serial(env_port, baud, timeout=TIMEOUT)
        except Exception as e:
            last_err = e
    # 3) Kandidatenliste
    for p in PORT_CANDIDATES:
        try:
            return serial.Serial(p, baud, timeout=TIMEOUT)
        except Exception as e:
            last_err = e
    raise last_err or RuntimeError("Kein serieller Pico-Port gefunden")

def main():
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("--port", dest="port", default=None, help="serieller Port (optional)")
    ap.add_argument("--baud", dest="baud", type=int, default=DEFAULT_BAUD, help="Baudrate (Default 115200)")
    ap.add_argument("cmd", nargs=argparse.REMAINDER, help="Befehl(e) an den Pico (z.B. COLOR 0 255 0)")
    args = ap.parse_args()

    if not args.cmd:
        print(__doc__ or "", file=sys.stderr)
        sys.exit(2)

    baud = int(args.baud) if args.baud else DEFAULT_BAUD
    cmd = " ".join(args.cmd).strip() + "\n"

    try:
        with open_port(args.port, baud) as ser:
            # kurzer Moment, falls der Pico gerade (neu) enumeriert hat
            time.sleep(0.1)
            ser.write(cmd.encode("ascii"))
            ser.flush()
    except Exception as e:
        print(f"[led_client] Fehler: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
