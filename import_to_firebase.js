/**
 * Script para importar movimientos históricos a Firebase
 * Ejecutar con: node import_to_firebase.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuración Firebase
const FIREBASE_DB_URL = 'mercato-fbdcc-default-rtdb.firebaseio.com';
const INPUT_FILE = path.join(__dirname, 'movimientos_smart.txt');

// Regex patterns (mismos que index.html)
const reSmartFormat = /^\[([^\]]+)\] (.+)/;
const reTransfer = /(.+?) ha (comprado|vendido) al jugador (.+?) (?:de|a) (.+?) por ([\d\.]+)/;
const reShield = /(.+?) ha blindado a (.+)/i;
const reRewardJornada = /En la jornada (\d+), (.+?) ha ganado ([\d\.]+)/i;
const reReward11 = /(.+?) ha ganado ([\d\.]+)[€]? por tener.+11 ideal/i;

// Normalizar fechas
function normalizeDate(dateStr) {
    if (!dateStr || dateStr === 'NODATE') return 'Sin fecha';
    
    // Si es solo hora (ej: "20:37"), añadir fecha de hoy
    if (/^\d{1,2}:\d{2}$/.test(dateStr)) {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        return `${dd}/${mm}/${yyyy} ${dateStr}`;
    }
    
    return dateStr;
}

// Limpiar texto de caracteres raros
function cleanText(text) {
    return text
        .replace(/[�?'']/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Parsear archivo
function parseMovements(content) {
    const lines = content.split('\n');
    const movements = [];
    const seenIds = new Set();
    
    console.log(`📖 Leyendo ${lines.length} líneas...`);
    
    for (const rawLine of lines) {
        const line = cleanText(rawLine);
        if (!line || line.startsWith('#') || line.startsWith('---')) continue;
        
        const smartMatch = line.match(reSmartFormat);
        if (!smartMatch) continue;
        
        const dateKey = smartMatch[1].trim();
        const textToParse = smartMatch[2];
        const normalizedDate = normalizeDate(dateKey);
        
        // 1. Transferencias
        let match = textToParse.match(reTransfer);
        if (match) {
            const [_, actor, action, player, otherParty, amountStr] = match;
            const amount = parseInt(amountStr.replace(/\./g, ''));
            const buyer = action === 'comprado' ? actor.trim() : otherParty.trim();
            const seller = action === 'comprado' ? otherParty.trim() : actor.trim();
            
            const id = `transfer_${dateKey}_${buyer}_${seller}_${player}_${amount}`;
            
            if (!seenIds.has(id)) {
                seenIds.add(id);
                movements.push({
                    id,
                    type: 'transfer',
                    buyer,
                    seller,
                    player: player.trim(),
                    amount,
                    date: normalizedDate
                });
            }
            continue;
        }
        
        // 2. Blindajes
        match = textToParse.match(reShield);
        if (match) {
            const [_, manager, player] = match;
            const id = `shield_${dateKey}_${manager.trim()}_${player.trim()}`;
            
            if (!seenIds.has(id)) {
                seenIds.add(id);
                movements.push({
                    id,
                    type: 'shield',
                    beneficiary: manager.trim(),
                    player: player.trim(),
                    amount: 0,
                    details: 'Blindaje',
                    date: normalizedDate
                });
            }
            continue;
        }
        
        // 3. Premios Jornada
        match = textToParse.match(reRewardJornada);
        if (match) {
            const [_, jornada, beneficiary, amountStr] = match;
            const amount = parseInt(amountStr.replace(/\./g, ''));
            const id = `reward_jor${jornada}_${beneficiary.trim()}`;
            
            if (!seenIds.has(id)) {
                seenIds.add(id);
                movements.push({
                    id,
                    type: 'reward',
                    subtype: 'jornada',
                    beneficiary: beneficiary.trim(),
                    amount,
                    details: `Jornada ${jornada}`,
                    date: normalizedDate
                });
            }
            continue;
        }
        
        // 4. Premios 11 Ideal
        match = textToParse.match(reReward11);
        if (match) {
            const [_, beneficiary, amountStr] = match;
            const amount = parseInt(amountStr.replace(/\./g, ''));
            const id = `reward_11_${beneficiary.trim()}_${dateKey}_${amount}`;
            
            if (!seenIds.has(id)) {
                seenIds.add(id);
                movements.push({
                    id,
                    type: 'reward',
                    subtype: '11ideal',
                    beneficiary: beneficiary.trim(),
                    amount,
                    details: '11 Ideal',
                    date: normalizedDate
                });
            }
            continue;
        }
    }
    
    return movements;
}

// Subir a Firebase via REST API
function uploadToFirebase(movements) {
    return new Promise((resolve, reject) => {
        // Estructura de datos completa
        const data = {
            managers: {
                "Vigar24": { initialBudget: 103000000, teamValue: 0, clauseExpenses: 0, name: "Vigar24" },
                "Vigar FC": { initialBudget: 103000000, teamValue: 0, clauseExpenses: 0, name: "Vigar FC" },
                "GOLENCIERRO FC": { initialBudget: 103000000, teamValue: 0, clauseExpenses: 0, name: "GOLENCIERRO FC" },
                "Pablinistan FC": { initialBudget: 103000000, teamValue: 0, clauseExpenses: 0, name: "Pablinistan FC" },
                "Alcatamy eSports By": { initialBudget: 100000000, teamValue: 0, clauseExpenses: 0, name: "Alcatamy eSports By" },
                "Alcatamy eSports By ": { initialBudget: 100000000, teamValue: 0, clauseExpenses: 0, name: "Alcatamy eSports By " },
                "Visite La Manga FC": { initialBudget: 103000000, teamValue: 0, clauseExpenses: 0, name: "Visite La Manga FC" },
                "Morenazos FC": { initialBudget: 103000000, teamValue: 0, clauseExpenses: 0, name: "Morenazos FC" }
            },
            movements: movements,
            lastUpdate: Date.now(),
            importedAt: new Date().toISOString()
        };
        
        const jsonData = JSON.stringify(data);
        
        const options = {
            hostname: FIREBASE_DB_URL,
            path: '/fantasy_data.json',
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(jsonData)
            }
        };
        
        console.log(`\n🚀 Subiendo ${movements.length} movimientos a Firebase...`);
        
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`✅ Subida exitosa!`);
                    resolve(body);
                } else {
                    console.log(`❌ Error HTTP ${res.statusCode}: ${body}`);
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', reject);
        req.write(jsonData);
        req.end();
    });
}

// Main
async function main() {
    console.log('═'.repeat(60));
    console.log('IMPORTADOR DE MOVIMIENTOS A FIREBASE');
    console.log('═'.repeat(60));
    
    // Leer archivo
    console.log(`\n📂 Leyendo: ${INPUT_FILE}`);
    const content = fs.readFileSync(INPUT_FILE, 'utf8');
    
    // Parsear
    const movements = parseMovements(content);
    console.log(`\n📊 Movimientos parseados: ${movements.length}`);
    
    // Mostrar resumen por tipo
    const stats = {};
    movements.forEach(m => {
        stats[m.type] = (stats[m.type] || 0) + 1;
    });
    console.log('   Resumen:', stats);
    
    // Subir a Firebase
    try {
        await uploadToFirebase(movements);
        console.log('\n🎉 ¡Importación completada!');
        console.log('   Los datos ahora están en Firebase.');
        console.log('   La app ya puede usarlos directamente.');
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

main();
