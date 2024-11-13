import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import './payreport.css'; // Reuse payreport.css for styling
import UserSidebar from './UserSidebar';
import UserHeader from './UserHeader';
import { useUser } from './Auth/UserContext';

const Dues = () => {
  const [dueOrders, setDueOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userData } = useUser();

  useEffect(() => {
    const fetchDueOrders = async () => {
      try {
        const q = query(
          collection(db, 'tables'),
          where('payment.status', '==', 'Due')
        );
        const querySnapshot = await getDocs(q);
        const duesData = {};

        querySnapshot.forEach(doc => {
          const table = doc.data();
          if (table.orderHistory) {
            table.orderHistory.forEach(order => {
              if (order.payment.status === 'Due') {
                const responsible = order.payment.responsible || 'Unknown';

                // Create a unique key for each responsible name
                if (!duesData[responsible]) {
                  duesData[responsible] = {
                    responsible,
                    total: 0,
                    discountedTotal: 0,
                    method: order.payment.method,
                    status: order.payment.status,
                    orders: [],
                    timestamp: order.payment.timestamp, // Store the latest timestamp per responsible
                    amountPaid: 0, // Amount paid initialized
                    amountRemaining: 0, // Amount remaining initialized
                  };
                }

                // Update amounts and order details under that responsible
                duesData[responsible].total += order.payment.total || 0;
                duesData[responsible].discountedTotal += order.payment.discountedTotal || order.payment.total || 0;
                duesData[responsible].orders.push(...order.orders);
              }
            });
          }
        });

        // Convert aggregated data into an array and set state
        setDueOrders(Object.values(duesData));
      } catch (error) {
        console.error('Error fetching due orders:', error);
      }
    };

    fetchDueOrders();
  }, []);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleTotalClick = (orders) => {
    setSelectedOrders(orders);
  };

  // Update the amount paid and remaining for a responsible entry
  const handleAmountChange = (e, responsible, type) => {
    const updatedOrders = dueOrders.map(order => {
      if (order.responsible === responsible) {
        if (type === 'paid') {
          order.amountPaid = parseFloat(e.target.value) || 0;
        } else if (type === 'remaining') {
          order.amountRemaining = parseFloat(e.target.value) || 0;
        }
      }
      return order;
    });

    setDueOrders(updatedOrders);
  };

  return (
    <div className={`report-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <UserSidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
      <div className="report-content">
        <UserHeader onMenuClick={handleSidebarToggle} isSidebarOpen={sidebarOpen} />

        <h2 style={{ marginLeft: '10px', marginTop: '100px' }}>Dues Report</h2>

        {dueOrders.length > 0 ? (
          <>
            <table>
              <thead>
                <tr>
                  <th>Responsible</th>
                  <th>Total Amount</th>
                  <th>Discounted Total</th>
                  <th>Payment Method</th>
                  <th>Payment Status</th>
                  <th>Time</th>
                 
                </tr>
              </thead>
              <tbody>
                {dueOrders.map((entry, index) => (
                  <tr key={index}>
                    <td>{entry.responsible}</td>
                    <td>
                      ₹{entry.total.toFixed(2)}
                    </td>
                    <td>₹{entry.discountedTotal.toFixed(2)}</td>
                    <td>{entry.method || 'N/A'}</td>
                    <td>{entry.status || 'N/A'}</td>
                    <td>{new Date(entry.timestamp).toLocaleString() || 'N/A'}</td>

                    {/* Amount Paid input field */}
                    

                    {/* Amount Remaining input field */}
                  
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
          <p>No dues found.</p>
        )}
      </div>
    </div>
  );
};

export default Dues;
