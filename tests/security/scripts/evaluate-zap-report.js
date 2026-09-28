const { createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');

const reportFile = process.env.SECURITY_ZAP_REPORT || '/results/active-read.json';
const evidenceFile = process.env.SECURITY_EVIDENCE_FILE || '/results/execution-evidence.md';
const commit = String(process.env.SECURITY_COMMIT || '').trim();
const duration = String(process.env.SECURITY_SCAN_DURATION || '').trim();
const targetEnv = String(process.env.SECURITY_TARGET_ENV || '');

const riskNames = ['Informativa', 'Baja', 'Media', 'Alta'];

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const sanitizeText = (value) => String(value || '')
  .replace(/[|\r\n]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const readReport = () => {
  let rawReport;
  try {
    rawReport = readFileSync(reportFile);
  } catch (error) {
    throw new Error(`No fue posible leer el reporte JSON de ZAP en ${reportFile}: ${error.message}`);
  }

  let report;
  try {
    report = JSON.parse(rawReport.toString('utf8'));
  } catch (error) {
    throw new Error(`El reporte de ZAP no contiene JSON válido: ${error.message}`);
  }

  return {
    report,
    reportHash: createHash('sha256').update(rawReport).digest('hex'),
  };
};

const countAlerts = (report) => {
  const alerts = [0, 0, 0, 0];
  const instances = [0, 0, 0, 0];
  let ignoredFalsePositives = 0;

  for (const site of report.site) {
    for (const alert of Array.isArray(site.alerts) ? site.alerts : []) {
      const risk = Number(alert.riskcode);
      const confidence = Number(alert.confidence);
      if (!Number.isInteger(risk) || risk < 0 || risk > 3) continue;
      if (confidence === 0) {
        ignoredFalsePositives += 1;
        continue;
      }

      alerts[risk] += 1;
      instances[risk] += Array.isArray(alert.instances) && alert.instances.length > 0
        ? alert.instances.length
        : 1;
    }
  }

  return { alerts, instances, ignoredFalsePositives };
};

const renderEvidence = ({ report, reportHash, counts, requiresReview }) => {
  const lines = [
    '# Evidencia de ejecución de seguridad',
    '',
    '> Este archivo acredita la ejecución. No sustituye el informe de resultados y no contiene rutas afectadas, payloads, solicitudes, respuestas, credenciales ni decisiones de riesgo.',
    '',
    '## Ejecución',
    '',
    '| Campo | Valor |',
    '|---|---|',
    `| Fecha del reporte | ${sanitizeText(report.created || report['@generated'] || 'No disponible')} |`,
    `| Commit evaluado | \`${commit}\` |`,
    `| Versión de ZAP | ${sanitizeText(report['@version'] || 'No disponible')} |`,
    '| Ambiente | Local |',
    '| Perfil | Administrador ficticio de pruebas |',
    '| Plan | `plans/active-read.yaml` |',
    '| Cobertura | Contrato OpenAPI de lectura y análisis activo controlado |',
    `| Duración | ${sanitizeText(duration)} |`,
    `| SHA-256 del reporte crudo | \`${reportHash}\` |`,
    '',
    '## Conteos',
    '',
    '| Riesgo | Alertas | Instancias |',
    '|---|---:|---:|',
    ...[3, 2, 1, 0].map((risk) => (
      `| ${riskNames[risk]} | ${counts.alerts[risk]} | ${counts.instances[risk]} |`
    )),
    `| Falsos positivos marcados por ZAP | ${counts.ignoredFalsePositives} | N/A |`,
    '',
    '## Resultado',
    '',
    requiresReview
      ? 'REQUIERE REVISIÓN: el reporte contiene alertas altas o medias que deben analizarse fuera del repositorio.'
      : 'APROBADO: el reporte no contiene alertas altas o medias pendientes de análisis.',
    '',
    'El informe detallado se prepara fuera del repositorio utilizando el reporte crudo local y los requisitos de la guía del sprint.',
    '',
  ];

  return `${lines.join('\n')}\n`;
};

const run = () => {
  assert(targetEnv === 'local', 'El gate solo admite resultados del ambiente local.');
  assert(/^[0-9a-f]{7,40}$/i.test(commit), 'SECURITY_COMMIT debe contener el hash del commit evaluado.');
  assert(duration, 'SECURITY_SCAN_DURATION es requerida para registrar la ejecución.');

  const { report, reportHash } = readReport();
  assert(
    Array.isArray(report.site) && report.site.length > 0,
    'El reporte de ZAP no contiene sitios evaluados.',
  );
  assert(
    report.site.every((site) => /^http:\/\/(backend|host\.docker\.internal):3000(?:\/|$)/i.test(site['@name'] || '')),
    'El reporte contiene un objetivo diferente del backend local autorizado.',
  );

  const counts = countAlerts(report);
  const requiresReview = counts.alerts[3] > 0 || counts.alerts[2] > 0;
  writeFileSync(
    evidenceFile,
    renderEvidence({ report, reportHash, counts, requiresReview }),
    'utf8',
  );

  console.log(`Evidencia de ejecución generada en ${evidenceFile}.`);
  console.log(`Alertas altas: ${counts.alerts[3]}; medias: ${counts.alerts[2]}.`);
  assert(
    !requiresReview,
    'El reporte requiere análisis y clasificación fuera del repositorio.',
  );
  console.log('PASS: el reporte no contiene alertas altas o medias pendientes de análisis.');
};

try {
  run();
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
}
