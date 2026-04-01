import userModel from '../models/user.model.js';
import * as userService from '../services/user.service.js';
import { validationResult } from 'express-validator';
import redisClient from '../services/redis.service.js';
import { sendPasswordResetEmail } from '../services/email.service.js';
import jwt from 'jsonwebtoken';


export const createUserController = async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const email = String(req.body.email || '').trim().toLowerCase()
        const password = req.body.password
        const user = await userService.createUser({ email, password });

        const token = await user.generateJWT();

        delete user._doc.password;

        res.status(201).json({ user, token });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}

export const loginController = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {

        const email = String(req.body.email || '').trim().toLowerCase()
        const { password } = req.body;

        const user = await userModel.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                errors: 'Invalid credentials'
            })
        }

        const isMatch = await user.isValidPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                errors: 'Invalid credentials'
            })
        }

        const token = await user.generateJWT();

        delete user._doc.password;

        res.status(200).json({ user, token });


    } catch (err) {

        console.log(err);

        res.status(400).json({ message: err.message });
    }
}

export const profileController = async (req, res) => {

    res.status(200).json({
        user: req.user
    });

}

export const logoutController = async (req, res) => {
    try {

        const token = req.cookies.token || req.headers.authorization.split(' ')[1];

        redisClient.set(token, 'logout', 'EX', 60 * 60 * 24);

        res.status(200).json({
            message: 'Logged out successfully'
        });


    } catch (err) {
        console.log(err);
        res.status(400).json({ message: err.message });
    }
}

export const getAllUsersController = async (req, res) => {
    try {

        const loggedInUser = await userModel.findOne({
            email: req.user.email
        })

        const allUsers = await userService.getAllUsers({ userId: loggedInUser._id });

        return res.status(200).json({
            users: allUsers
        })

    } catch (err) {

        console.log(err)

        res.status(400).json({ error: err.message })

    }
}

export const forgotPasswordController = async (req, res) => {
    const errorResult = validationResult(req);
    if (!errorResult.isEmpty()) {
        return res.status(400).json({ errors: errorResult.array() });
    }

    try {
        const { email } = req.body;
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User with this email not found' });
        }

        const resetToken = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        await sendPasswordResetEmail(user.email, resetToken);

        res.status(200).json({ message: 'Password reset link sent to your email. Check your inbox (and spam folder)!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const resetPasswordController = async (req, res) => {
    const errorResult = validationResult(req);
    if (!errorResult.isEmpty()) {
        return res.status(400).json({ errors: errorResult.array() });
    }

    try {
        const { token, password } = req.body;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await userModel.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const hashedPassword = await userModel.hashPassword(password);
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: 'Password reset successful. You can now login with your new password!' });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ message: 'Reset link has expired. Please request a new one.' });
        }
        res.status(400).json({ message: 'Invalid or expired reset link.' });
    }
};
