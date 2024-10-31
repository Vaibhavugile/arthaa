import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs,query, where, } from 'firebase/firestore';
import { db } from '../firebase';
import './TableDetail.css';
import { useUser } from './Auth/UserContext'; // Assuming you're using a UserContext for branchCode

const TableDetail = () => {
  const { tableId } = useParams();
  const [table, setTable] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [products, setProducts] = useState([]);
  const [groupedProducts, setGroupedProducts] = useState({});
  const [productQuantities, setProductQuantities] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [orderChanges, setOrderChanges] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [expandedSubcategory, setExpandedSubcategory] = useState(null);
  const { userData } = useUser(); // Get user data from context
  const [branchCode, setBranchCode] = useState(''); // Store branch code

  // Fetch table details
  useEffect(() => {
    const fetchTable = async () => {
      const tableRef = doc(db, 'tables', tableId);
      const tableDoc = await getDoc(tableRef);
      if (tableDoc.exists()) {
        setTable({ id: tableDoc.id, ...tableDoc.data() });
        setOrderChanges(tableDoc.data().orders || []);
      }
    };
    fetchTable();
  }, [tableId]);
  useEffect(() => {
    if (userData && userData.branchCode) {
      setBranchCode(userData.branchCode);
    }
  }, [userData]);

  // Fetch available products and group by subcategory
  useEffect(() => {
    const fetchProducts = async () => {
      const productsCollection = query(
        collection(db,'products'),
        where('branchCode','==',userData.branchCode)
      )

      const productsSnapshot = await getDocs(productsCollection);
      const productList = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productList);

      // Group products by subcategory
      const grouped = productList.reduce((acc, product) => {
        if (!acc[product.subcategory]) {
          acc[product.subcategory] = [];
        }
        acc[product.subcategory].push(product);
        return acc;
      }, {});
      setGroupedProducts(grouped);

      // Initialize product quantities
      const initialQuantities = productList.reduce((acc, product) => {
        acc[product.id] = 0;
        return acc;
      }, {});
      setProductQuantities(initialQuantities);
    };
    fetchProducts();
  }, []);

  // Fetch menu items for orders
  

  // Handle quantity adjustment for each product
  const handleQuantityChange = (productId, quantityChange) => {
    setProductQuantities(prevQuantities => ({
      ...prevQuantities,
      [productId]: Math.max(1, prevQuantities[productId] + quantityChange)
    }));
  };

  // Handle adding all selected products to the table's order
  const handleAddAllProducts = async () => {
    const selectedProducts = products.filter(product => productQuantities[product.id] > 0);

    if (selectedProducts.length === 0) {
      alert('No products selected.');
      return;
    }

    const updatedOrders = [...orderChanges];

    selectedProducts.forEach(product => {
      const existingOrderIndex = updatedOrders.findIndex(order => order.name === product.name);

      if (existingOrderIndex !== -1) {
        updatedOrders[existingOrderIndex].quantity += productQuantities[product.id];
      } else {
        updatedOrders.push({
          name: product.name,
          price: product.price,
          quantity: productQuantities[product.id],
          ingredients: product.ingredients // Include ingredients when adding product
        });
      }
    });

    const tableRef = doc(db, 'tables', tableId);
    try {
      await updateDoc(tableRef, {
        orders: updatedOrders
      });
      alert('Products added/updated successfully.');
      const tableDoc = await getDoc(tableRef);
      if (tableDoc.exists()) {
        setTable({ id: tableDoc.id, ...tableDoc.data() });
        setOrderChanges(updatedOrders);
      }
    } catch (error) {
      console.error('Error adding products: ', error);
    }
  };

  // Toggle edit mode to modify the order
  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  // Handle changes to the order during editing
  const handleOrderChange = (index, quantityChange) => {
    const updatedOrders = [...orderChanges];
    updatedOrders[index].quantity += quantityChange;

    if (updatedOrders[index].quantity <= 0) {
      // Remove the product if quantity becomes zero or less
      updatedOrders.splice(index, 1);
    }

    setOrderChanges(updatedOrders);
  };

  // Save the updated order list
  const handleSaveChanges = async () => {
    const tableRef = doc(db, 'tables', tableId);
    try {
      await updateDoc(tableRef, {
        orders: orderChanges
      });
      alert('Orders updated successfully.');
      setEditMode(false);
      const tableDoc = await getDoc(tableRef);
      if (tableDoc.exists()) {
        setTable({ id: tableDoc.id, ...tableDoc.data() });
      }
    } catch (error) {
      console.error('Error updating orders: ', error);
    }
  };

  // Toggle the visibility of products under a subcategory
  const toggleSubcategory = (subcategory) => {
    setExpandedSubcategory(expandedSubcategory === subcategory ? null : subcategory);
  };

  // Handle adding items to selected orders


 

  return (
    <div>
      {table ? (
        <div>
          <h2>Table: {table.tableNumber}</h2>
          <h3>Orders</h3>
          <ul>
            {orderChanges.map((order, index) => (
              <li key={index}>
                {order.quantity} x {order.name} - ${order.price * order.quantity}
                {editMode && (
                  <div className="edit-controls">
                    <button onClick={() => handleOrderChange(index, -1)}>-</button>
                    <button onClick={() => handleOrderChange(index, +1)}>+</button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <button onClick={toggleEditMode}>
            {editMode ? 'Cancel Edit' : 'Edit Orders'}
          </button>

          {editMode && <button onClick={handleSaveChanges}>Save Changes</button>}

          <h3>Add Products to Table</h3>
          <button onClick={() => setShowMenu(!showMenu)}>
            {showMenu ? 'Hide Menu' : '+ Show Menu'}
          </button>
          <button className="add-all-btn" onClick={handleAddAllProducts}>
            Add to Table
          </button>

          {showMenu && (
  <div className="product-menu">

    <div className="subcategory-container">
    
      {Object.keys(groupedProducts).map((subcategory) => (
        <div key={subcategory} className="subcategory-card">
          <button className="subcategory-button" onClick={() => toggleSubcategory(subcategory)}>
            {subcategory}
          </button>
          {expandedSubcategory === subcategory && (
            <div className="subcategory-products">
              {groupedProducts[subcategory].map(product => (
                <div key={product.id} className="product-item">
                  <span>{product.name} - ₹{product.price}</span>
                  <div className="quantity-controls">
                    <button onClick={() => handleQuantityChange(product.id, -1)}>-</button>
                    <span>{productQuantities[product.id]}</span>
                    <button onClick={() => handleQuantityChange(product.id, +1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>

    
  </div>
)}

        </div>
      ) : (
        <p>Loading table...</p>
      )}
    </div>
  );
};

export default TableDetail;

