import { Router } from 'express';

import userRouter from '../routes/users';

import folderRouter from '../routes/folders'

import documentRouter from '../routes/documents';



const configureRouters = (app : Router) => {

    app.use('/api', userRouter);

    app.use('/api/docs', folderRouter);
    app.use('/api/docs', documentRouter);

};



export default configureRouters;