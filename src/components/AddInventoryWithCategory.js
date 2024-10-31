import React, { useState , useEffect } from 'react';
import { db } from '../firebase'; // Firebase initialization
import { collection, addDoc ,} from 'firebase/firestore'; // Import addDoc instead of using db.collection directly
import { useUser } from '../components/Auth/UserContext'; // Assuming you're using a UserContext for branchCode

function AddIngredient() {
  const [ingredientName, setIngredientName] = useState('');
  const[category,setCategory]=useState('')
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('grams');
  const [branchCode, setBranchCode] = useState(''); // Store branch code
  const { userData } = useUser();
  useEffect(() => {
    if (userData && userData.branchCode) {
      setBranchCode(userData.branchCode);
    }
  }, [userData]);
  const handleAddIngredient = async () => {
    // Add new ingredient to Firestore
    
    try {
      const docRef = await addDoc(collection(db, 'Inventory'), {
        ingredientName,
        category,
        quantity: parseFloat(quantity),
        unit,
        branchCode,
      });
      alert('Ingredient added successfully!');
      setIngredientName('');
      setCategory('');
      setQuantity('');
    } catch (error) {
      console.error("Error adding ingredient: ", error);
    }
  };

  return (
    <div>
      <h1>Add New Ingredient</h1>
      <input
        type="text"
        placeholder="Ingredient Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />
      <input
        type="text"
        placeholder="Ingredient Name"
        value={ingredientName}
        onChange={(e) => setIngredientName(e.target.value)}
      />
      <input
        type="number"
        placeholder="Quantity"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />
      <select value={unit} onChange={(e) => setUnit(e.target.value)}>
        <option value="grams">Grams</option>
        <option value="kilograms">Kilograms</option>
        <option value="liters">Liters</option>
      </select>
      <button onClick={handleAddIngredient}>Add Ingredient</button>
    </div>
  );
}

export default AddIngredient;

