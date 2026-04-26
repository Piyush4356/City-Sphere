const PlaceSuggestion = require('../models/PlaceSuggestion');
const { uploadPlaceImage, deleteImage } = require('../utils/cloudinaryUpload');
const { sendEmail } = require('../utils/sendEmail');
const User = require('../models/User');

// POST /api/suggestions/submit
// User submits a new place
exports.submitPlace = async (req, res) => {
  try {
    const { name, type, cityName, lat, lon, description } = req.body;

    if (!name || !type || !cityName || !lat || !lon) {
      return res.status(400).json({ message: 'Name, type, city, and coordinates are required' });
    }

    // Check duplicate — same name + city already pending or approved
    const existing = await PlaceSuggestion.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      cityName: { $regex: new RegExp(cityName, 'i') },
      status: { $in: ['pending', 'approved'] }
    });

    if (existing) {
      return res.status(409).json({ 
        message: 'This place has already been submitted or approved' 
      });
    }

    // Upload image if provided
    let imageUrl = null;
    let imagePublicId = null;
    if (req.file) {
      const uploaded = await uploadPlaceImage(req.file.buffer);
      imageUrl = uploaded.url;
      imagePublicId = uploaded.publicId;
    }

    const suggestion = await PlaceSuggestion.create({
      submittedBy: req.user.id,
      name, type, cityName,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      description,
      imageUrl,
      imagePublicId
    });

    // Notify admin by email
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await sendEmail({
        to: admin.email,
        subject: `New place suggestion: ${name} in ${cityName}`,
        html: `
          <h3>New Place Suggestion</h3>
          <p><strong>${name}</strong> (${type}) in ${cityName}</p>
          <p>${description || 'No description provided'}</p>
          <p>Submitted by user ID: ${req.user.id}</p>
          <p>Review it in your admin panel.</p>
        `
      });
    }

    res.status(201).json({ 
      message: 'Place submitted for review. We will notify you once approved!',
      suggestion 
    });
  } catch (err) {
    console.error('Submit place error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/suggestions/mine
// User sees their own submissions and their status
exports.getMySubmissions = async (req, res) => {
  try {
    const suggestions = await PlaceSuggestion
      .find({ submittedBy: req.user.id })
      .sort({ createdAt: -1 });
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/suggestions/approved/:cityName
// Public endpoint for ExploreContext
exports.getApproved = async (req, res) => {
  try {
    const places = await PlaceSuggestion.find({
      cityName: { $regex: new RegExp(req.params.cityName, 'i') },
      status: 'approved'
    });
    res.json(places);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/suggestions/admin/pending  (admin only)
exports.getPending = async (req, res) => {
  try {
    const pending = await PlaceSuggestion
      .find({ status: 'pending' })
      .populate('submittedBy', 'name email')
      .sort({ createdAt: 1 });  // oldest first — review in order
    res.json(pending);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/suggestions/admin/review/:id  (admin only)
exports.reviewSuggestion = async (req, res) => {
  try {
    const { status, adminNote } = req.body;  // status = 'approved' or 'rejected'
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const suggestion = await PlaceSuggestion
      .findById(req.params.id)
      .populate('submittedBy', 'name email');

    if (!suggestion) return res.status(404).json({ message: 'Suggestion not found' });

    suggestion.status = status;
    suggestion.adminNote = adminNote || null;
    suggestion.reviewedBy = req.user.id;
    suggestion.reviewedAt = new Date();
    await suggestion.save();

    // If rejected, clean up Cloudinary image to save storage
    if (status === 'rejected' && suggestion.imagePublicId) {
      await deleteImage(suggestion.imagePublicId);
      suggestion.imageUrl = null;
      suggestion.imagePublicId = null;
      await suggestion.save();
    }

    // Email the user who submitted
    if (suggestion.submittedBy?.email) {
      const isApproved = status === 'approved';
      try {
        await sendEmail({
          to: suggestion.submittedBy.email,
          subject: isApproved 
            ? `✅ Your place "${suggestion.name}" is now live on City Sphere!`
            : `Update on your place suggestion: "${suggestion.name}"`,
          html: isApproved
            ? `<h3>Great news, ${suggestion.submittedBy.name}!</h3>
               <p>Your suggested place <strong>${suggestion.name}</strong> in ${suggestion.cityName} has been approved and is now live on City Sphere.</p>
               <p>Thank you for contributing to your community!</p>`
            : `<h3>Hi ${suggestion.submittedBy.name},</h3>
               <p>Your suggestion for <strong>${suggestion.name}</strong> was not approved.</p>
               ${adminNote ? `<p><strong>Reason:</strong> ${adminNote}</p>` : ''}
               <p>You can refine and resubmit if you'd like.</p>`
        });
      } catch (emailErr) {
        console.warn('Review success but email notification failed:', emailErr);
        // Continue anyway so the review is saved
      }
    }

    res.json({ message: `Suggestion ${status}`, suggestion });
  } catch (err) {
    console.error('Review error (CRITICAL):', err);
    res.status(500).json({ message: 'Server error processing review', error: err.message });
  }
};

// GET /api/suggestions/admin/history (admin only)
exports.getAdminHistory = async (req, res) => {
  try {
    const history = await PlaceSuggestion
      .find({ status: { $in: ['approved', 'rejected'] } })
      .populate('submittedBy', 'name email')
      .populate('reviewedBy', 'name')
      .sort({ reviewedAt: -1 });
    res.json(history);
  } catch (err) {
    console.error('Fetch history error:', err);
    res.status(500).json({ message: 'Server error fetching history' });
  }
};

// DELETE /api/suggestions/admin/:id (admin only)
exports.deleteSuggestion = async (req, res) => {
  try {
    const suggestion = await PlaceSuggestion.findById(req.params.id);
    if (!suggestion) return res.status(404).json({ message: 'Suggestion not found' });

    // Cleanup Cloudinary image if it exists
    if (suggestion.imagePublicId) {
      await deleteImage(suggestion.imagePublicId);
    }

    await PlaceSuggestion.findByIdAndDelete(req.params.id);
    res.json({ message: 'Suggestion deleted permanently' });
  } catch (err) {
    console.error('Delete suggestion error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
