import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import './Report.css';
import UserSidebar from './UserSidebar';
import UserHeader from './UserHeader';
import { useUser } from './Auth/UserContext';

const OrdersReport = () => {
  const [tables, setTables] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [branchCode, setBranchCode] = useState('');
  const [totalReport, setTotalReport] = useState({ totalOrders: 0, grandTotal: 0 });
  const [selectedDate, setSelectedDate] = useState('');
  const [topItems, setTopItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState(''); // New state for search query
  const { userData } = useUser();

  useEffect(() => {
    if (userData && userData.branchCode) {
      setBranchCode(userData.branchCode);
    }
  }, [userData]);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const q = query(collection(db, 'tables'), where('branchCode', '==', branchCode));
        const querySnapshot = await getDocs(q);
        const tableData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        calculateReportData(tableData);
        setTables(tableData);
      } catch (error) {
        console.error("Error fetching tables: ", error);
      }
    };

    fetchTables();
  }, [branchCode]);

  const calculateReportData = (tableData) => {
    let totalOrders = 0;
    let grandTotal = 0;
    const itemCounts = {};

    tableData.forEach(table => {
      if (Array.isArray(table.orders)) {
        table.orders.forEach(order => {
          totalOrders += 1;
          const price = parseFloat(order.price) || 0;
          grandTotal += order.quantity * price;

          // Track item frequency
          if (order.name in itemCounts) {
            itemCounts[order.name] += order.quantity;
          } else {
            itemCounts[order.name] = order.quantity;
          }
        });
      }
      if (Array.isArray(table.orderHistory)) {
        table.orderHistory.forEach(historyEntry => {
          historyEntry.orders.forEach(order => {
            totalOrders += 1;
            const price = parseFloat(order.price) || 0;
            grandTotal += order.quantity * price;

            // Track item frequency
            if (order.name in itemCounts) {
              itemCounts[order.name] += order.quantity;
            } else {
              itemCounts[order.name] = order.quantity;
            }
          });
        });
      }
    });

    // Sort top items by frequency
    const topItemsArray = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    setTopItems(topItemsArray);
    setTotalReport({ totalOrders, grandTotal });
  };

  const handleSidebarToggle = () => setSidebarOpen(!sidebarOpen);
  const handleDateChange = (e) => setSelectedDate(e.target.value);
  const handleSearchChange = (e) => setSearchQuery(e.target.value.toLowerCase()); // Handle search input

  return (
    <div className={`report-container ₹{sidebarOpen ? 'sidebar-open' : ''}`}>
      <UserSidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
      <div className="report-content">
        <UserHeader onMenuClick={handleSidebarToggle} isSidebarOpen={sidebarOpen} />

        <h2>Detailed Orders Report & Trends</h2>

        {/* Summary and Trends Report */}
        <div className="report-summary">
          <h3>Summary Statistics</h3>
          <p><strong>Total Orders:</strong> {totalReport.totalOrders}</p>
          <p><strong>Grand Total Revenue:</strong> ₹{totalReport.grandTotal.toFixed(2)}</p>
        </div>

        {/* Date Filter */}
        <div className="date-filter">
          <label htmlFor="order-date">Filter by Date:</label>
          <input 
            type="date" 
            id="order-date" 
            value={selectedDate} 
            onChange={handleDateChange} 
          />
        </div>

        {/* Search Input for Product Name */}
        <div className="search-filter">
          <label htmlFor="product-search">Search by Product Name:</label>
          <input 
            type="text" 
            id="product-search" 
            value={searchQuery} 
            onChange={handleSearchChange} 
            placeholder="Enter product name..." 
          />
        </div>

        {/* Top Items */}
        <div className="top-items">
          <h3>Top 5 Most Ordered Items</h3>
          <ul>
            {topItems.map(([item, count], index) => (
              <li key={index}>
                {item}: {count} orders
              </li>
            ))}
          </ul>
        </div>

        {/* Table Data */}
        {tables.length > 0 ? (
          tables.map(table => (
            <div key={table.id} className="report-card">
              <h3>Table {table.tableNumber}</h3>
              {/* Summary for each table */}
              <div className="table-summary">
                <p><strong>Active Orders Total:</strong> ₹{table.orders?.reduce((acc, order) => acc + (order.quantity * parseFloat(order.price || 0)), 0).toFixed(2)}</p>
                <p><strong>Order History Total:</strong> ₹{table.orderHistory?.reduce((acc, entry) => {
                  return acc + entry.orders.reduce((sum, order) => sum + (order.quantity * parseFloat(order.price || 0)), 0);
                }, 0).toFixed(2)}</p>
              </div>

              {/* Orders and Order History */}
              <div className="order-section">
                <h4>Current Orders</h4>
                {Array.isArray(table.orders) && table.orders.length > 0 ? (
                  <table className="order-table">
                    <thead>
                      <tr>
                        <th>Quantity</th>
                        <th>Item Name</th>
                        <th>Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.orders
                        .filter(order => order.name.toLowerCase().includes(searchQuery)) // Filter by search query
                        .map((order, index) => (
                          <tr key={index}>
                            <td>{order.quantity}</td>
                            <td>{order.name}</td>
                            <td>₹{parseFloat(order.price).toFixed(2)}</td>
                            <td>₹{(order.quantity * parseFloat(order.price)).toFixed(2)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No active orders.</p>
                )}

                <h4>Order History</h4>
                {Array.isArray(table.orderHistory) && table.orderHistory.length > 0 ? (
                  table.orderHistory
                    .filter(historyEntry => !selectedDate || historyEntry.payment?.timestamp.startsWith(selectedDate))
                    .map((historyEntry, index) => (
                      <div key={index} className="order-history-entry">
                        <p><strong>Order Timestamp:</strong> {historyEntry.payment?.timestamp || 'N/A'}</p>
                        <table className="order-history-table">
                          <thead>
                            <tr>
                              <th>Quantity</th>
                              <th>Item Name</th>
                              <th>Price</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historyEntry.orders
                              .filter(order => order.name.toLowerCase().includes(searchQuery)) // Filter by search query
                              .map((order, i) => (
                                <tr key={i}>
                                  <td>{order.quantity}</td>
                                  <td>{order.name}</td>
                                  <td>₹{parseFloat(order.price).toFixed(2)}</td>
                                  <td>₹{(order.quantity * parseFloat(order.price)).toFixed(2)}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ))
                ) : (
                  <p>No order history available.</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p>Loading tables...</p>
        )}
      </div>
    </div>
  );
};

export default OrdersReport;
