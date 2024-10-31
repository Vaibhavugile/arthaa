import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, query, where, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import './InventoryDashboard.css'; // Importing CSS from Product Dashboard
import UserHeader from './UserHeader';
import UserSidebar from './UserSidebar';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { useUser } from '../components/Auth/UserContext';

const InventoryDashboard = () => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { userData } = useUser();

  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        const q = query(
          collection(db, 'Inventory'),
          where('branchCode', '==', userData.branchCode)
        );
        const querySnapshot = await getDocs(q);
        const fetchedItems = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setInventoryItems(fetchedItems);
      } catch (error) {
        console.error('Error fetching inventory data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventoryData();
  }, [userData]);

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'Inventory', id));
      setInventoryItems(inventoryItems.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error deleting inventory item:', error);
    }
  };

  const handleEdit = (id) => {
    navigate(`/editinventory/${id}`);
  };

  const handleAddInventory = () => {
    navigate('/add-ingredient');
  };
  const handleAddStock = () => {
    navigate('/add-stock');
  };


  const formatLastUpdated = (lastUpdated) => {
    if (lastUpdated && lastUpdated.toDate) {
      return lastUpdated.toDate().toLocaleString();
    }
    return lastUpdated; // or handle as needed (e.g., return a default string)
  };

  return (
    <div className={`dashboard-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <UserSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="dashboard-content">
        <UserHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <h2 style={{ marginLeft: '10px', marginTop: '100px' }}
        >Total Inventory Items</h2>
        <div className="action-buttons">
          <button onClick={handleAddInventory}>
            <FaPlus /> Add Inventory Item
          </button>
          <button onClick={handleAddStock}>
            <FaPlus /> Update Stock
          </button>
        </div>
        <div className="table-container">
          {loading ? (
            <p>Loading inventory...</p>
          ) : inventoryItems.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
              <th>Branch Code</th>
              <th>Category</th>
              <th>Ingredient Name</th>
              <th>Last Updated</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {inventoryItems.map((item) => (
                  <tr key={item.id}>
                     <td>{item.branchCode}</td>
                    <td>{item.category}</td>
                    <td>{item.ingredientName}</td>
                    <td>{formatLastUpdated(item.lastUpdated)}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td>
                      <div className="action-buttons">
                        <label onClick={() => handleEdit(item.id)}><FaEdit /></label>
                        <label onClick={() => handleDelete(item.id)}><FaTrash /></label>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No inventory items found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;
