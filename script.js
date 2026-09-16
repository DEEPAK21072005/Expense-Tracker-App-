// Toggle Modes
function toggleMode(mode) {
    document.getElementById('expenseMode').style.display = 'none';
    document.getElementById('monthlyOverviewMode').style.display = 'none';

    if (mode === 'expenseMode') {
        document.getElementById('expenseMode').style.display = 'block';
    } else {
        document.getElementById('monthlyOverviewMode').style.display = 'block';
    }
}

// Expense Mode Functionality
function calculateExpense() {
    const members = document.getElementById('memberNames').value.split(',');
    const totalAmount = parseFloat(document.getElementById('totalAmount').value);
    const contributions = document.getElementById('contributions').value.split(',').map(Number);

    if (members.length !== contributions.length) {
        alert('Number of members and contributions do not match.');
        return;
    }

    const equalShare = totalAmount / members.length;
    let resultHTML = `<p>Total Amount: ₹${totalAmount}</p>`;
    resultHTML += `<p>Equal Share per Member: ₹${equalShare.toFixed(2)}</p>`;

    members.forEach((member, index) => {
        const difference = contributions[index] - equalShare;
        const status = difference < 0 
            ? `${member.trim()} owes ₹${Math.abs(difference.toFixed(2))}`
            : `${member.trim()} paid ₹${difference.toFixed(2)} extra`;
        resultHTML += `<p>${status}</p>`;
    });

    document.getElementById('result').innerHTML = resultHTML;
}

// Monthly Overview Mode Functionality
let monthlyData = JSON.parse(localStorage.getItem('monthlyData')) || {};

function saveData() {
    const date = document.getElementById('date').value;
    const income = parseFloat(document.getElementById('monthlyIncome').value);
    const savings = parseFloat(document.getElementById('monthlySavings').value);
    const expenses = parseFloat(document.getElementById('monthlyExpenses').value);

    if (!date || isNaN(income) || isNaN(savings) || isNaN(expenses)) {
        alert('Please fill out all fields');
        return;
    }

    monthlyData[date] = { income, savings, expenses, remaining: income - expenses };
    localStorage.setItem('monthlyData', JSON.stringify(monthlyData));
    document.getElementById('monthlyResult').innerHTML = `Data saved for ${date}`;
}

function deleteData() {
    const date = document.getElementById('date').value;
    if (monthlyData[date]) {
        delete monthlyData[date];
        localStorage.setItem('monthlyData', JSON.stringify(monthlyData));
        document.getElementById('monthlyResult').innerHTML = `Data for ${date} deleted.`;
    } else {
        alert('No data found for the selected date.');
    }
}

function generateMonthlyPDF() {
    const pdf = new jspdf.jsPDF();
    const dataEntries = Object.entries(monthlyData);

    if (dataEntries.length === 0) {
        alert('No data available to generate PDF.');
        return;
    }

    pdf.setFontSize(18);
    pdf.text('Monthly Overview Report', 20, 20);

    let yOffset = 40;
    pdf.setFontSize(12);

    dataEntries.forEach(([date, data], index) => {
        pdf.text(
            `${index + 1}. Date: ${date}, Income: ₹${data.income}, Expenses: ₹${data.expenses}, Savings: ₹${data.savings}, Remaining: ₹${data.remaining}`,
            20, yOffset
        );
        yOffset += 10;
    });

    pdf.save('Monthly_Overview_Report.pdf');
}
