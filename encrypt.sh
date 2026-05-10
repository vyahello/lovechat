#!/usr/bin/env bash
set -e

ACCESS=".access"

if [ ! -f "$ACCESS" ]; then
  echo "Error: .access file not found" >&2
  exit 1
fi

DATE_VAL=$(sed -n '1p' "$ACCESS")
VENUE_VAL=$(sed -n '2p' "$ACCESS")

if [ -z "$DATE_VAL" ] || [ -z "$VENUE_VAL" ]; then
  echo "Error: .access must have date on line 1 and venue on line 2" >&2
  exit 1
fi

node encrypt.js "$DATE_VAL" "$VENUE_VAL"
