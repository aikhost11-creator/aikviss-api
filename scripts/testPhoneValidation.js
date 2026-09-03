const phoneValidator = require('../utils/phoneValidator');

async function test() {
    console.log('Testing PhoneValidator...');
    await phoneValidator.init();

    const testNumbers = [
        '9073543738',   // Line 2 in olddata.csv
        '+919073543738', // With country code
        '9373886169',   // Line 3 in olddata.csv
        '09321549589',  // Line 4 with leading zero
        '1234567890'    // Not in olddata.csv
    ];

    for (const num of testNumbers) {
        const isBlocked = await phoneValidator.isMobileBlocked(num);
        console.log(`Mobile: ${num.padEnd(15)} => Blocked: ${isBlocked}`);
    }
}

test()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Test error:', err);
        process.exit(1);
    });
