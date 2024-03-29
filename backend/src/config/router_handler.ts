import { Router } from 'express';
import userRouter from '../routes/users';
import folderRouter from '../routes/folders'

const configureRouters = (app : Router) => {
    app.use('/api', userRouter);
    app.use('/api', folderRouter);
};

export default configureRouters;