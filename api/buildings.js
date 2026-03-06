import dbConnect from '../lib/mongodb';
import Building from '../server/models/Building.js';
import Flat from '../server/models/Flat.js';

export default async function handler(req, res) {
  await dbConnect();

  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        if (req.query.id) {
          // GET single building
          const building = await Building.findById(req.query.id);
          if (!building) {
            return res.status(404).json({ message: 'Building not found' });
          }
          return res.json(building);
        } else {
          // GET all buildings with flat counts
          const buildings = await Building.find().sort({ createdAt: -1 });

          const buildingsWithCounts = await Promise.all(
            buildings.map(async (building) => {
              const totalFlats = await Flat.countDocuments({ building: building._id });
              const occupiedFlats = await Flat.countDocuments({
                building: building._id,
                status: 'occupied',
              });
              return {
                ...building.toObject(),
                totalFlats,
                occupiedFlats,
                vacantFlats: totalFlats - occupiedFlats,
              };
            })
          );

          return res.json(buildingsWithCounts);
        }
      } catch (err) {
        return res.status(500).json({ message: err.message });
      }

    case 'POST':
      try {
        const building = new Building({
          name: req.body.name,
          address: req.body.address,
          description: req.body.description,
        });
        const newBuilding = await building.save();
        return res.status(201).json(newBuilding);
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }

    case 'PUT':
      try {
        const building = await Building.findByIdAndUpdate(
          req.query.id,
          { name: req.body.name, address: req.body.address, description: req.body.description },
          { new: true, runValidators: true }
        );
        if (!building) {
          return res.status(404).json({ message: 'Building not found' });
        }
        return res.json(building);
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }

    case 'DELETE':
      try {
        const building = await Building.findById(req.query.id);
        if (!building) {
          return res.status(404).json({ message: 'Building not found' });
        }

        const flatsCount = await Flat.countDocuments({ building: req.query.id });
        if (flatsCount > 0) {
          return res
            .status(400)
            .json({ message: 'Cannot delete a building that still has flats. Remove the flats first.' });
        }

        await building.deleteOne();
        return res.json({ message: 'Building deleted successfully' });
      } catch (err) {
        return res.status(500).json({ message: err.message });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}

