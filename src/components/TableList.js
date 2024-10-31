import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import UserSidebar from './UserSidebar'; 
import UserHeader from './UserHeader';    
import './TableList.css';
import { useUser } from './Auth/UserContext'; // Assuming you're using a UserContext for branchCode


const TableList = () => {
  const [tables, setTables] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState(0); 
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  const [branchCode, setBranchCode] = useState(''); // Store branch code
  const { userData } = useUser(); // Get user data from context


  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen); 
  };
  useEffect(() => {
    if (userData && userData.branchCode) {
      setBranchCode(userData.branchCode);
    }
  }, [userData]);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const q= query(
          collection(db,'tables'),
          where('branchCode','==',userData.branchCode)
        )
        const querySnapshot = await getDocs(q);
        const tableData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          orderStatus: 'Running Order' 
        }));
        setTables(tableData);
      } catch (error) {
        console.error("Error fetching tables: ", error);
      }
    };

    fetchTables();
  }, []);

  const calculateTotalPrice = (orders) => {
    return orders.reduce((total, order) => total + (order.price * order.quantity), 0);
  };

  const calculateDiscountedPrice = (totalPrice, discountPercentage) => {
    const discountAmount = (totalPrice * discountPercentage) / 100;
    return totalPrice - discountAmount;
  };

  const handleOpenPaymentModal = (table) => {
    setSelectedTable(table);
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedTable(null);
    setPaymentMethod('');
    setPaymentStatus('');
    setResponsibleName('');
    setDiscountPercentage(0); 
  };

  const updateIngredientQuantities = async (orders) => {
    try {
      const inventoryUpdates = {};
  
      for (const order of orders) {
        console.log("Processing order:", order); // Log the current order being processed
        
        if (order.ingredients) {
          for (const ingredient of order.ingredients) {
            const ingredientName = ingredient.ingredientName; // Correctly access ingredient name
            const quantityUsed = parseFloat(ingredient.quantityUsed) * order.quantity; // Calculate total quantity used
  
            // Log ingredient details and calculated quantities
            console.log(`Ingredient: ${ingredientName}, Amount per order: ${ingredient.quantityUsed}, Quantity ordered: ${order.quantity}, Total used: ${quantityUsed}`);
  
            if (inventoryUpdates[ingredientName]) {
              inventoryUpdates[ingredientName] += quantityUsed;
            } else {
              inventoryUpdates[ingredientName] = quantityUsed;
            }
          }
        }
      }
  
      console.log("Inventory Updates Object:", inventoryUpdates); // Log the inventory updates object
  
      for (const [ingredientName, quantityUsed] of Object.entries(inventoryUpdates)) {
        const q = query(collection(db, 'Inventory'),where('branchCode', '==', branchCode), where('ingredientName', '==', ingredientName) );
        const querySnapshot = await getDocs(q);
  
        querySnapshot.forEach(async (doc) => {
          const ingredientRef = doc.ref; // Get the document reference
          const currentQuantity = doc.data().quantity;
          const updatedQuantity = currentQuantity - quantityUsed; // Reduce the quantity
  
          console.log(`Updating ingredient: ${ingredientName}, Current quantity: ${currentQuantity}, Quantity used: ${quantityUsed}, Updated quantity: ${updatedQuantity},Branch Code :${userData.branchCode}`); // Log the update details
          
          await updateDoc(ingredientRef, { quantity: updatedQuantity });
        });
      }
    } catch (error) {
      console.error("Error updating ingredient quantities: ", error);
    }
  };
  

  const handleSavePayment = async () => {
    if (selectedTable && paymentMethod && paymentStatus) {
      const tableRef = doc(db, 'tables', selectedTable.id);
      let updatedOrderStatus = '';
      let updatedOrders = selectedTable.orders;
      let previousOrders = selectedTable.orderHistory || [];

      const totalPrice = calculateTotalPrice(selectedTable.orders);
      const discountedPrice = calculateDiscountedPrice(totalPrice, discountPercentage);

      const newHistoryEntry = {
        orders: selectedTable.orders,
        payment: {
          total: totalPrice,
          discountedTotal: discountedPrice, 
          discountPercentage, 
          status: paymentStatus,
          method: paymentMethod,
          responsible: paymentStatus === 'Due' ? responsibleName : null,
          timestamp: new Date().toISOString()
        }
      };

      if (paymentStatus === 'Settled') {
        updatedOrderStatus = 'Payment Successfully Settled';
        previousOrders = [...previousOrders, newHistoryEntry];
        updatedOrders = [];
      } else if (paymentStatus === 'Due' && responsibleName.trim() !== '') {
        updatedOrderStatus = `Payment Due Successfully by ${responsibleName}`;
        previousOrders = [...previousOrders, newHistoryEntry];
        updatedOrders = [];
      } else {
        alert('Please enter the responsible person\'s name for due payments.');
        return;
      }

      try {
        await updateDoc(tableRef, {
          payment: {
            total: totalPrice,
            discountedTotal: discountedPrice,
            discountPercentage,
            status: paymentStatus,
            method: paymentMethod,
            responsible: paymentStatus === 'Due' ? responsibleName : null
          },
          orders: updatedOrders,
          orderHistory: previousOrders,
          orderStatus: updatedOrders.length === 0 ? 'New Order' : updatedOrderStatus
        });

        await updateIngredientQuantities(selectedTable.orders); // Reduce ingredient quantities
        alert('Payment details saved successfully');
        handleClosePaymentModal();
      } catch (error) {
        console.error("Error saving payment details: ", error);
      }
    } else {
      alert('Please select a payment method and status');
    }
  };

  return (
    <div className={`table-list-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <UserSidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
      <div className="table-list-content">
        <UserHeader onMenuClick={handleSidebarToggle} isSidebarOpen={sidebarOpen} />

        <h2>Tables</h2>
        <div className="table-list">
          {tables.map(table => {
            const totalPrice = calculateTotalPrice(table.orders);
            const cardClass = totalPrice > 0 ? 'table-card payment-due' : 'table-card';

            return (
              <div key={table.id} className={cardClass}>
                <Link to={`/table/${table.id}`}>
                  <button className="table-button">{table.tableNumber}</button>
                </Link>
                <button className="payment-button" onClick={() => handleOpenPaymentModal(table)}>
                  Pay {totalPrice.toFixed(2)}
                </button>
              </div>
            );
          })}
        </div>

        {showPaymentModal && selectedTable && (
          <div className="modal">
            <div className="modal-content">
              <h3>Payment for Table {selectedTable.tableNumber}</h3>

              {selectedTable.orders.length > 0 ? (
                <>
                  <p>Total Price: ₹{calculateTotalPrice(selectedTable.orders)}</p>

                  <h4>Order Summary:</h4>
                  <ul>
                    {selectedTable.orders.map((order, index) => (
                      <li key={index}>
                        {order.quantity} x {order.name} - ₹{order.price * order.quantity}
                      </li>
                    ))}
                  </ul>
                  <label>
                    Discount Percentage:
                    <input
                      type="number"
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(e.target.value)}
                    />
                  </label>
                  <div>
                    <label>Payment Method:</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="">Select Method</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="UPI">UPI</option>
                    </select>
                  </div>
                  <div>
                    <label>Payment Status:</label>
                    <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                      <option value="">Select Status</option>
                      <option value="Settled">Settled</option>
                      <option value="Due">Due</option>
                    </select>
                  </div>
                  {paymentStatus === 'Due' && (
                    <div>
                      <label>Responsible Person:</label>
                      <input
                        type="text"
                        value={responsibleName}
                        onChange={(e) => setResponsibleName(e.target.value)}
                      />
                    </div>
                  )}
                  <button onClick={handleSavePayment}>Save Payment</button>
                  <button onClick={handleClosePaymentModal}>Cancel</button>
                </>
              ) : (
                <p>No orders to display.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableList;
