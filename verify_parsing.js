
const lines = [
    "[10/12/2025] Vigar FC ha ganado 100.000€ por tener jugadores en el 11 ideal de la jornada 14.",
    "[09/12/2025] En la jornada 15, Pablinistan FC ha ganado 3.600.000€",
    "[09/12/2025] Alcatamy eSports By  ha blindado a Foyth"
];

const reSmartFormat = /^\[([^\]]+)\] (.+)/;
const reRewardJornada = /En la jornada (\d+), (.+?) ha ganado ([\d\.]+)[€]?/i;
const reReward11 = /(.+?) ha ganado ([\d\.]+)[€]? por tener.+11 ideal/i;
const reShield = /(.+?) ha blindado a (.+)/i;

lines.forEach(line => {
    console.log(`Testing line: ${line}`);
    const smartMatch = line.match(reSmartFormat);
    if (smartMatch) {
        const textToParse = smartMatch[2];
        console.log(`Text to parse: '${textToParse}'`);

        const match11 = textToParse.match(reReward11);
        if (match11) {
            console.log("Matched Reward 11!");
            console.log("Beneficiary:", match11[1]);
            console.log("Amount:", match11[2]);
        }

        const matchJor = textToParse.match(reRewardJornada);
        if (matchJor) {
            console.log("Matched Reward Jornada!");
            console.log("Beneficiary:", matchJor[2]);
        }

        const matchShield = textToParse.match(reShield);
        if (matchShield) {
            console.log("Matched Shield!");
            console.log("Beneficiary:", matchShield[1]);
            console.log("Player:", matchShield[2]);
        }
    } else {
        console.log("Failed smart match");
    }
    console.log("---");
});
