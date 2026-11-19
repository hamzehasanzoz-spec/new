// api/db/neo4j.js – وحدة الاتصال وإدارة قواعد بيانات Neo4j (GraphRAG Storage)
// تدعم الاتصال بـ Neo4j وتنفيذ استعلامات Cypher لربط الأدوية والأمراض والأعراض

import neo4j from 'neo4j-driver';

// قراءة بيانات الاتصال من متغيرات البيئة
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';

let driver = null;

function getNeo4jDriver() {
  if (!driver) {
    if (!NEO4J_PASSWORD) {
      console.warn('⚠️ تحذير: NEO4J_PASSWORD غير متوفر في متغيرات البيئة.');
    }
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  }
  return driver;
}

// دالة لحفظ الكيانات والعلاقات المستخرجة في Neo4j
export async function saveExtractedGraph(entities = [], relations = []) {
  if (entities.length === 0 && relations.length === 0) return { success: true, count: 0 };

  const driverInstance = getNeo4jDriver();
  const session = driverInstance.session();

  try {
    // تشغيل معاملة (Transaction) لتخزين الكيانات والعلاقات بأمان
    const result = await session.writeTransaction(async tx => {
      let queryCount = 0;

      // 1. إنشاء أو تحديث الكيانات (Nodes)
      for (const entity of entities) {
        if (!entity.name || !entity.type) continue;
        const cypherNode = `
          MERGE (n:${entity.type.replace(/[^a-zA-Z0-9_]/g, '')} {name: $name})
          ON CREATE SET n.created_at = timestamp()
          RETURN n
        `;
        await tx.run(cypherNode, { name: entity.name.trim() });
        queryCount++;
      }

      // 2. إنشاء العلاقات بين الكيانات (Relationships)
      for (const rel of relations) {
        if (!rel.source || !rel.target || !rel.relation) continue;
        const relType = rel.relation.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
        const cypherRel = `
          MATCH (a {name: $source})
          MATCH (b {name: $target})
          MERGE (a)-[r:${relType}]->(b)
          ON CREATE SET r.created_at = timestamp()
          RETURN r
        `;
        await tx.run(cypherRel, { 
          source: rel.source.trim(), 
          target: rel.target.trim() 
        });
        queryCount++;
      }

      return queryCount;
    });

    return { success: true, operations: result };
  } catch (error) {
    console.error('❌ Neo4j Save Error:', error);
    throw error;
  } finally {
    await session.close();
  }
}

// دالة للبحث في الرسم البياني عن الكيانات ذات الصلة
export async function searchGraph(keyword, limit = 5) {
  const driverInstance = getNeo4jDriver();
  const session = driverInstance.session();

  try {
    const result = await session.readTransaction(async tx => {
      const query = `
        MATCH (n)
        WHERE toLower(n.name) CONTAINS toLower($keyword)
        OPTIONAL MATCH (n)-[r]-(m)
        RETURN n, type(r) as relType, m
        LIMIT $limit
      `;
      const res = await tx.run(query, { keyword: keyword.trim(), limit: neo4j.int(limit) });
      return res.records.map(record => ({
        node: record.get('n').properties,
        relation: record.get('relType'),
        connectedNode: record.get('m') ? record.get('m').properties : null
      }));
    });

    return { success: true, results: result };
  } catch (error) {
    console.error('❌ Neo4j Search Error:', error);
    throw error;
  } finally {
    await session.close();
  }
}
