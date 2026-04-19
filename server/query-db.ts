import { db } from './pg-db';
import { objectives, serviceLines, services } from '@shared/pg-schema';

async function main() {
  const [objs, sLines, svcs] = await Promise.all([
    db.select().from(objectives),
    db.select().from(serviceLines),
    db.select().from(services),
  ]);
  console.log('OBJECTIVES:', JSON.stringify(objs.map(o => ({ id: o.id, title: o.title, ownerId: o.ownerId })), null, 2));
  console.log('SERVICE LINES:', JSON.stringify(sLines.map(sl => ({ id: sl.id, name: sl.name, code: sl.code })), null, 2));
  console.log('SERVICES:', JSON.stringify(svcs.map(s => ({ id: s.id, name: s.name, code: s.code, serviceLineId: s.serviceLineId })), null, 2));
  process.exit(0);
}

main().catch(console.error);
