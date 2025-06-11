const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB file size limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

mongoose.connect('mongodb+srv://jikew32666:nih7jgcq1pkSSyGY@cluster0.jbdxjkc.mongodb.net/autoreplydb');

const ReplySchema = new mongoose.Schema({
  name: String,
  comment: String,
  date: { type: Date, default: Date.now },
  imageUrl: String,
  reactions: {
    like: { type: Number, default: 0 },
    love: { type: Number, default: 0 },
    laugh: { type: Number, default: 0 },
    likeUsers: { type: [String], default: [] },
    loveUsers: { type: [String], default: [] },
    laughUsers: { type: [String], default: [] }
  }
});

const CommentSchema = new mongoose.Schema({
  name: String,
  comment: String,
  date: { type: Date, default: Date.now },
  imageUrl: String,
  replies: [ReplySchema],
  reactions: {
    like: { type: Number, default: 0 },
    love: { type: Number, default: 0 },
    laugh: { type: Number, default: 0 },
    likeUsers: { type: [String], default: [] },
    loveUsers: { type: [String], default: [] },
    laughUsers: { type: [String], default: [] }
  }
});
const Comment = mongoose.model('Comment', CommentSchema);

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Password for deletion
const DELETE_PASSWORD = 'chamindu2008';

app.get('/comments', async (req, res) => {
  try {
    const comments = await Comment.find().sort({ date: -1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load comments' });
  }
});

app.post('/comments', upload.single('image'), async (req, res) => {
  try {
    const { name, comment } = req.body;
    if (!name || !comment) return res.status(400).json({ error: 'Name and comment are required' });

    let imageUrl = '';
    if (req.file) {
      const newPath = `uploads/${Date.now()}_${req.file.originalname}`;
      fs.renameSync(req.file.path, newPath);
      imageUrl = `/${newPath}`;
    }

    const newComment = new Comment({ name, comment, imageUrl });
    await newComment.save();
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/comments/reply', upload.single('image'), async (req, res) => {
  try {
    const { parentId, name, comment } = req.body;
    if (!parentId || !name || !comment) return res.status(400).json({ error: 'Missing required fields' });

    const parent = await Comment.findById(parentId);
    if (!parent) return res.status(404).json({ error: 'Comment not found' });

    let imageUrl = '';
    if (req.file) {
      const newPath = `uploads/${Date.now()}_${req.file.originalname}`;
      fs.renameSync(req.file.path, newPath);
      imageUrl = `/${newPath}`;
    }

    parent.replies.push({ name, comment, imageUrl });
    await parent.save();
    res.status(201).json(parent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/comments/react', async (req, res) => {
  try {
    const { commentId, replyId, type, userIP } = req.body;
    const validReactions = ['like', 'love', 'laugh'];
    if (!validReactions.includes(type)) return res.status(400).json({ error: 'Invalid reaction type' });

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (replyId) {
      const reply = comment.replies.id(replyId);
      if (!reply) return res.status(404).json({ error: 'Reply not found' });
      
      if (!reply.reactions) {
        reply.reactions = { 
          like: 0, love: 0, laugh: 0,
          likeUsers: [], loveUsers: [], laughUsers: []
        };
      }
      
      const allUserReactions = [
        ...reply.reactions.likeUsers,
        ...reply.reactions.loveUsers,
        ...reply.reactions.laughUsers
      ];
      
      if (allUserReactions.includes(userIP)) {
        const userReactionType = 
          reply.reactions.likeUsers.includes(userIP) ? 'like' :
          reply.reactions.loveUsers.includes(userIP) ? 'love' :
          'laugh';
        
        if (userReactionType === type) {
          reply.reactions[type]--;
          reply.reactions[`${type}Users`] = reply.reactions[`${type}Users`].filter(ip => ip !== userIP);
        } else {
          reply.reactions[userReactionType]--;
          reply.reactions[`${userReactionType}Users`] = reply.reactions[`${userReactionType}Users`].filter(ip => ip !== userIP);
          
          reply.reactions[type]++;
          reply.reactions[`${type}Users`].push(userIP);
        }
      } else {
        reply.reactions[type]++;
        reply.reactions[`${type}Users`].push(userIP);
      }
    } else {
      if (!comment.reactions) {
        comment.reactions = { 
          like: 0, love: 0, laugh: 0,
          likeUsers: [], loveUsers: [], laughUsers: []
        };
      }
      
      const allUserReactions = [
        ...comment.reactions.likeUsers,
        ...comment.reactions.loveUsers,
        ...comment.reactions.laughUsers
      ];
      
      if (allUserReactions.includes(userIP)) {
        const userReactionType = 
          comment.reactions.likeUsers.includes(userIP) ? 'like' :
          comment.reactions.loveUsers.includes(userIP) ? 'love' :
          'laugh';
        
        if (userReactionType === type) {
          comment.reactions[type]--;
          comment.reactions[`${type}Users`] = comment.reactions[`${type}Users`].filter(ip => ip !== userIP);
        } else {
          comment.reactions[userReactionType]--;
          comment.reactions[`${userReactionType}Users`] = comment.reactions[`${userReactionType}Users`].filter(ip => ip !== userIP);
          
          comment.reactions[type]++;
          comment.reactions[`${type}Users`].push(userIP);
        }
      } else {
        comment.reactions[type]++;
        comment.reactions[`${type}Users`].push(userIP);
      }
    }

    await comment.save();
    res.status(200).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete comment endpoint
app.delete('/comments/:id', async (req, res) => {
  try {
    const { password } = req.body;
    if (password !== DELETE_PASSWORD) {
      return res.status(403).json({ error: 'Incorrect password' });
    }

    const comment = await Comment.findByIdAndDelete(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Delete associated image if exists
    if (comment.imageUrl) {
      const imagePath = path.join(__dirname, comment.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete reply endpoint
app.delete('/comments/:commentId/replies/:replyId', async (req, res) => {
  try {
    const { password } = req.body;
    if (password !== DELETE_PASSWORD) {
      return res.status(403).json({ error: 'Incorrect password' });
    }

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    // Delete associated image if exists
    if (reply.imageUrl) {
      const imagePath = path.join(__dirname, reply.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    reply.remove();
    await comment.save();
    res.status(200).json({ message: 'Reply deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
