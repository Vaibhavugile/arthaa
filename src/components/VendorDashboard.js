import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import './InventoryDashboard.css'; // Use the same CSS as Inventory Dashboard
import UserHeader from './UserHeader';
import UserSidebar from './UserSidebar';
import { useUser } from './Auth/UserContext';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

const VendorPaymentDashboard = () => {
  const [vendorPayments, setVendorPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userData } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVendorPayments = async () => {
      if (userData && userData.branchCode) {
        const q = query(collection(db, 'Vendors'), where('branchCode', '==', userData.branchCode));
        const vendorSnapshot = await getDocs(q);

        const paymentsData = await Promise.all(
          vendorSnapshot.docs.map(async (vendorDoc) => {
            const vendorData = vendorDoc.data();
            const stockRef = collection(vendorDoc.ref, 'Stock');
            const stockSnapshot = await getDocs(stockRef);

            let totalPayment = 0;
            const invoiceDates = [];

            stockSnapshot.docs.forEach((stockDoc) => {
              const stockData = stockDoc.data();
              totalPayment += stockData.price || 0; // sum of prices
              if (stockData.invoiceDate) {
                invoiceDates.push(stockData.invoiceDate);
              }
            });

            return {
              vendorId: vendorDoc.id,
              vendorName: vendorData.name,
              totalPayment,
              invoiceDates,
            };
          })
        );

        setVendorPayments(paymentsData);
      }
      setLoading(false);
    };

    fetchVendorPayments();
  }, [userData]);
 

  const handleEdit = (id) => {
    navigate(`/editinventory/${id}`);
  };

  const handleAddVendor = () => {
    navigate('/add-vendor');
  };

  return (
    <div className={`dashboard-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <UserSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="dashboard-content">
        <UserHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <h2 style={{ marginLeft: '10px', marginTop: '100px' }}>Vendor Payment Dashboard</h2>
        <div className="action-buttons">
          <button onClick={handleAddVendor}>
            <FaPlus /> Add New Vendor
          </button>
        </div>
        <div className="table-container">
          {loading ? (
            <p>Loading vendor payments...</p>
          ) : vendorPayments.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Vendor Name</th>
                  <th>Total Payment</th>
                  <th>Invoice Dates</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {vendorPayments.map((vendor) => (
                  <tr key={vendor.vendorId}>
                    <td>{vendor.vendorName}</td>
                    <td>{vendor.totalPayment.toFixed(2)}</td>
                    <td>
                      {vendor.invoiceDates.length > 0
                        ? vendor.invoiceDates.join(', ')
                        : 'No Invoices'}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <label onClick={() => handleEdit(vendor.id)}><FaEdit /></label>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No vendor payments found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorPaymentDashboard;
