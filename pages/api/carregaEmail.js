export default function handler(req, res) {
  if (req.method === 'POST') {
    const emailUser = process.env.EMAILUSER;
    console.log(emailUser);
    if (emailUser) {
      res.status(200).json({ emailUser });
    } else {
      res.status(404).json({ error: 'Email not found' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}