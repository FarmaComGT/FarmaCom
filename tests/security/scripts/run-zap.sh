#!/bin/sh

set -eu

target_env="${ZAP_TARGET_ENV:-}"
target_url="${ZAP_TARGET_URL:-}"
plan="${ZAP_PLAN:-plans/smoke.yaml}"

if [ "$target_env" != "local" ]; then
  echo "Error: el análisis automatizado solo admite ZAP_TARGET_ENV=local." >&2
  exit 2
fi

case "$target_url" in
  http://backend:3000|http://backend:3000/*|http://host.docker.internal:3000|http://host.docker.internal:3000/*)
    ;;
  *)
    echo "Error: ZAP_TARGET_URL debe apuntar al backend local autorizado." >&2
    exit 2
    ;;
esac

case "$plan" in
  plans/*.yaml|plans/*.yml)
    ;;
  *)
    echo "Error: ZAP_PLAN debe ser un archivo YAML dentro de plans/." >&2
    exit 2
    ;;
esac

case "$plan" in
  *..*)
    echo "Error: ZAP_PLAN no puede contener segmentos de ruta relativos." >&2
    exit 2
    ;;
esac

mkdir -p /zap/wrk/results

echo "Ejecutando ZAP contra el ambiente local autorizado: $target_url"
exec /zap/zap.sh -cmd -autorun "/zap/wrk/$plan"
