// Assuming data is fetched from the 'club_financial_summary' view
const ctx = document.getElementById('budgetChart').getContext('2d');

const budgetData = {
    labels: ['Remaining Balance', 'Total Spent (Bookings + Fines)'],
    datasets: [{
        label: 'Club Budget Breakdown',
        data: [current_balance, total_spent], // Variables from your SQL view
        backgroundColor: [
            'rgba(75, 192, 192, 0.6)', // Green for balance
            'rgba(255, 99, 132, 0.6)'  // Red for expenditures
        ],
        borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
    }]
};

const config = {
    type: 'pie',
    data: budgetData,
    options: {
        responsive: true,
        plugins: {
            title: {
                display: true,
                text: 'Real-Time Club Budget Utilization'
            }
        }
    }
};

new Chart(ctx, config);