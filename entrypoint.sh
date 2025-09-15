#!/bin/sh

# Process COMMANDS_FILE environment variable
if [ "${COMMANDS_FILE#/}" = "${COMMANDS_FILE}" ]; then
  COMMANDS_FILE="/app/dist/commands/${COMMANDS_FILE}"
fi

# Execute the application with proper signal handling
exec node dist/adapter-http.js --commands-file "${COMMANDS_FILE}"
