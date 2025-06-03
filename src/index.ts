import express from 'express';
import { identifyContact } from './contactService';

const app = express();
app.use(express.json());

app.post('/identify', async (req, res) => {
  const { email, phoneNumber } = req.body;
  try {
    const contact = await identifyContact(email, phoneNumber);
    res.status(200).json({ contact });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));