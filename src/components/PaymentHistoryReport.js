import React, { useEffect, useState } from 'react';
import { collection, getDocs,query, where,   } from 'firebase/firestore';
import { db } from '../firebase';
import './payreport.css'; // Import your CSS file for styles
import UserSidebar from './UserSidebar'; // Import the UserSidebar component
import UserHeader from './UserHeader'; // Import the UserHeader component
import { useUser } from './Auth/UserContext'; // Assuming you're using a UserContext for branchCode

const PaymentHistoryReport = () => {
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState(null); // For storing selected orders
  const [sidebarOpen, setSidebarOpen] = useState(false); // Sidebar toggle state
  const [filterDate, setFilterDate] = useState(''); // For storing the selected filter date
  const [filteredData, setFilteredData] = useState([]); // Filtered payment data for the selected date
  const [branchCode, setBranchCode] = useState(''); // Store branch code
  const { userData } = useUser(); // Get user data from context

  useEffect(() => {
    if (userData && userData.branchCode) {
      setBranchCode(userData.branchCode);
    }
  }, [userData]);
  useEffect(() => {
    const fetchPaymentHistory = async () => {
      try {
        const q= query(
          collection(db,'tables'),
          where('branchCode','==',userData.branchCode)
        )
        const querySnapshot = await getDocs(q);
        const historyData = [];

        querySnapshot.forEach(doc => {
          const table = doc.data();
          if (table.orderHistory) {
            table.orderHistory.forEach(order => {
              historyData.push({
                tableNumber: table.tableNumber,
                ...order.payment, // Extract payment details
                orders: order.orders,
                discountedTotal: order.payment.discountedTotal || order.payment.total,
                 // Keep order details if needed
                timestamp: order.payment.timestamp
              });
            });
          }
        });

        setPaymentHistory(historyData);
      } catch (error) {
        console.error("Error fetching payment history: ", error);
      }
    };

    fetchPaymentHistory();
  }, []);

  // Filter payment history by selected date
  useEffect(() => {
    if (filterDate) {
      const filtered = paymentHistory.filter((entry) => {
        const paymentDate = new Date(entry.timestamp).toISOString().split('T')[0];
        return paymentDate === filterDate; // Match payment entries with the selected date
      });
      setFilteredData(filtered);
    } else {
      setFilteredData(paymentHistory); // Show all data if no filter is selected
    }
  }, [filterDate, paymentHistory]);

  // Sort filtered data by timestamp (latest first)
  const sortedFilteredData = filteredData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const handleTotalClick = (orders) => {
    setSelectedOrders(orders);
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen); // Toggle sidebar visibility
  };

  const calculateTotals = (data) => {
    const totals = { Cash: 0, Card: 0, UPI: 0 };

    data.forEach((entry) => {
      const total = entry.discountedTotal || entry.total;
      if (entry.method === 'Cash') {
        totals.Cash += total;
      } else if (entry.method === 'Card') {
        totals.Card += total;
      } else if (entry.method === 'UPI') {
        totals.UPI += total;
      }
    });

    return totals;
  };

  const totals = calculateTotals(sortedFilteredData);

  return (
    <div className={`report-container₹{sidebarOpen ? 'sidebar-open' : ''}`}>
      <UserSidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
      <div className="report-content">
        <UserHeader onMenuClick={handleSidebarToggle} isSidebarOpen={sidebarOpen} />

        <h2 style={{ marginLeft: '10px', marginTop: '100px' }}>Payment History Report</h2>

        <div className="filter-section">
          <label htmlFor="dateFilter">Filter by Date:</label>
          <input
            type="date"
            id="dateFilter"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>

        <div className="totals-summary">
          <h3>Daily Totals for {filterDate || 'All Dates'}:</h3>
          <p>Cash Total:₹{totals.Cash.toFixed(2)}</p>
          <p>Card Total:₹{totals.Card.toFixed(2)}</p>
          <p>UPI Total:₹{totals.UPI.toFixed(2)}</p>
        </div>

        {sortedFilteredData.length > 0 ? (
          <>
            <table>
              <thead>
                <tr>
                  <th>Table Number</th>
                  <th>Total Amount</th>
                  <th>Discounted Total</th>
                  <th>Payment Method</th>
                  <th>Payment Status</th>
                  <th>Responsible</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {sortedFilteredData.map((entry, index) => (
                  <tr key={index}>
                    <td>{entry.tableNumber}</td>
                    <td
                      className="clickable-amount"
                      onClick={() => handleTotalClick(entry.orders)} // Handle click event
                    >
                     ₹{typeof entry.total === 'number' ? entry.total.toFixed(2) : parseFloat(entry.total).toFixed(2)}
                    </td>
                    <td>₹{entry.discountedTotal ? entry.discountedTotal.toFixed(2) : 'N/A'}</td> {/* Display Discounted Total */}
                    <td>{entry.method || 'N/A'}</td>
                    <td>{entry.status || 'N/A'}</td>
                    <td>{entry.responsible || 'N/A'}</td>
                    <td>{new Date(entry.timestamp).toLocaleString() || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selectedOrders && (
              <div className="orders-summary">
                <h3>Associated Orders:</h3>
                <ul>
                  {selectedOrders.map((order, index) => (
                    <li key={index}>
                      {order.quantity} x {order.name} -₹{order.price * order.quantity}
                    </li>
                  ))}
                </ul>
                <button onClick={() => setSelectedOrders(null)}>Close</button>
              </div>
            )}
          </>
        ) : (
          <p>No payment history available for the selected date.</p>
        )}
      </div>
    </div>
  );
};

export default PaymentHistoryReport;
