import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import './payreport.css';
import UserSidebar from './UserSidebar';
import UserHeader from './UserHeader';
import { useUser } from './Auth/UserContext';

const PaymentHistoryReport = () => {
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [branchCode, setBranchCode] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term
  const { userData } = useUser();

  useEffect(() => {
    if (userData && userData.branchCode) {
      setBranchCode(userData.branchCode);
    }
  }, [userData]);

  useEffect(() => {
    const fetchPaymentHistory = async () => {
      try {
        const q = query(
          collection(db, 'tables'),
          where('branchCode', '==', userData.branchCode)
        );
        const querySnapshot = await getDocs(q);
        const historyData = [];

        querySnapshot.forEach(doc => {
          const table = doc.data();
          if (table.orderHistory) {
            table.orderHistory.forEach(order => {
              historyData.push({
                tableNumber: table.tableNumber,
                ...order.payment,
                orders: order.orders,
                discountedTotal: order.payment.discountedTotal || order.payment.total,
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
  }, [userData]);

  // Filter payment history by selected date range
  useEffect(() => {
    let filtered = paymentHistory;

    if (fromDate && toDate) {
      filtered = filtered.filter(entry => {
        const paymentDate = new Date(entry.timestamp).toISOString().split('T')[0];
        return paymentDate >= fromDate && paymentDate <= toDate;
      });
    }

    setFilteredData(filtered);
  }, [fromDate, toDate, paymentHistory]);

  // Filter data based on search term
  const filteredBySearch = filteredData.filter(entry => 
    entry.tableNumber.toString().includes(searchTerm) ||
    (entry.method && entry.method.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (entry.status && entry.status.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (entry.responsible && entry.responsible.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Sort filtered data by timestamp (latest first)
  const sortedFilteredData = filteredBySearch.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const handleTotalClick = orders => {
    setSelectedOrders(orders);
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const calculateTotals = data => {
    const totals = { Cash: 0, Card: 0, UPI: 0, Due: 0 };

    data.forEach(entry => {
      const total = entry.discountedTotal || entry.total;
      if (entry.method === 'Cash') {
        totals.Cash += total;
      } else if (entry.method === 'Card') {
        totals.Card += total;
      } else if (entry.method === 'UPI') {
        totals.UPI += total;
      } else if (entry.method === 'Due') {
        totals.Due += total;
      }
    });

    return totals;
  };

  const totals = calculateTotals(sortedFilteredData);

  return (
    <div className={`report-container${sidebarOpen ? ' sidebar-open' : ''}`}>
      <UserSidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
      <div className="report-content">
        <UserHeader onMenuClick={handleSidebarToggle} isSidebarOpen={sidebarOpen} />

        <h2 style={{ marginLeft: '10px', marginTop: '100px' }}>Payment History Report</h2>

        <div className="filter-section">
          <label htmlFor="fromDate">From Date:</label>
          <input
            type="date"
            id="fromDate"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
          />
          <label htmlFor="toDate">To Date:</label>
          <input
            type="date"
            id="toDate"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
          />
          <label htmlFor="searchBar">Search:</label>
          <input
            type="text"
            id="searchBar"
            placeholder="Search Here..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="totals-summary">
          <h3>Daily Totals for {fromDate && toDate ? `${fromDate} to ${toDate}` : 'All Dates'}:</h3>
          <p>Cash Total: ₹{totals.Cash.toFixed(2)}</p>
          <p>Card Total: ₹{totals.Card.toFixed(2)}</p>
          <p>UPI Total: ₹{totals.UPI.toFixed(2)}</p>
          <p>Due Total: ₹{totals.Due.toFixed(2)}</p>
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
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {sortedFilteredData.map((entry, index) => (
                  <tr key={index}>
                    <td>{entry.tableNumber}</td>
                    <td
                      className="clickable-amount"
                      onClick={() => handleTotalClick(entry.orders)}
                    >
                      ₹{typeof entry.total === 'number' ? entry.total.toFixed(2) : parseFloat(entry.total).toFixed(2)}
                    </td>
                    <td>₹{entry.discountedTotal ? entry.discountedTotal.toFixed(2) : 'N/A'}</td>
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
                      {order.quantity} x {order.name} - ₹{order.price * order.quantity}
                    </li>
                  ))}
                </ul>
                <button onClick={() => setSelectedOrders(null)}>Close</button>
              </div>
            )}
          </>
        ) : (
          <p>No payment history available for the selected date range or search term.</p>
        )}
      </div>
    </div>
  );
};

export default PaymentHistoryReport;
