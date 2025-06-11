const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb+srv://jikew32666:nih7jgcq1pkSSyGY@cluster0.jbdxjkc.mongodb.net/autoreplydb');

const ReplySchema = new mongoose.Schema({
  name: String,
  comment: String,
  date: { type: Date, default: Date.now },
  reactions: {
    like: { type: Number, default: 0 },
    love: { type: Number, default: 0 },
    laugh: { type: Number, default: 0 }
  }
});

const CommentSchema = new mongoose.Schema({
  name: String,
  comment: String,
  date: { type: Date, default: Date.now },
  replies: [ReplySchema],
  reactions: {
    like: { type: Number, default: 0 },
    love: { type: Number, default: 0 },
    laugh: { type: Number, default: 0 }
  }
});
const Comment = mongoose.model('Comment', CommentSchema);

app.get('/comments', async (req, res) => {
  const comments = await Comment.find().sort({ date: -1 });
  res.json(comments);
});

app.post('/comments', async (req, res) => {
  const { name, comment } = req.body;
  if (!name || !comment) return res.status(400).json({ error: 'Missing fields' });
  const newComment = new Comment({ name, comment });
  await newComment.save();
  res.status(201).json(newComment);
});

app.post('/comments/reply', async (req, res) => {
  const { parentId, name, comment } = req.body;
  const parent = await Comment.findById(parentId);
  if (!parent) return res.status(404).json({ error: 'Comment not found' });
  parent.replies.push({ name, comment });
  await parent.save();
  res.status(201).json(parent);
});

app.post('/comments/react', async (req, res) => {
  const { commentId, reactionType } = req.body;
  const validReactions = ['like', 'love', 'laugh'];
  if (!validReactions.includes(reactionType)) {
    return res.status(400).json({ error: 'Invalid reaction type' });
  }

  const comment = await Comment.findByIdAndUpdate(
    commentId,
    { $inc: { [`reactions.${reactionType}`]: 1 } },
    { new: true }
  );
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  res.status(200).json(comment);
});

app.post('/comments/reply/react', async (req, res) => {
  const { commentId, replyId, reactionType } = req.body;
  const validReactions = ['like', 'love', 'laugh'];
  if (!validReactions.includes(reactionType)) {
    return res.status(400).json({ error: 'Invalid reaction type' });
  }

  const comment = await Comment.findOneAndUpdate(
    { _id: commentId, 'replies._id': replyId },
    { $inc: { [`replies.$.reactions.${reactionType}`]: 1 } },
    { new: true }
  );
  if (!comment) return res.status(404).json({ error: 'Reply not found' });
  res.status(200).json(comment);
});

app.listen(3000, () => console.log('Server running on port 3000'));
