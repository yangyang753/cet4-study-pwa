import inventory from '../content/v1/inventory.json' with { type: 'json' };
import { auditContentInventory } from '../src/content/contentAudit.ts';

const errors = auditContentInventory(inventory);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(Object.fromEntries(Object.entries(inventory).map(([key, value]) => [key, value.length])));
