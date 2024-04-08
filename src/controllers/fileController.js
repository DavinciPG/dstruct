const fs = require('fs');
const path = require('path');

const getFilePath = (filename) => path.join(__dirname, '../files', filename);

const fileController = {
    async createFile(filename) {
        const filePath = getFilePath(filename);

        await fs.writeFileSync(filePath, '');
        return true;
    },

    async updateFile(filename, content){
        const filePath = getFilePath(filename);

        // Check if file exists
        const exists = fs.existsSync(filePath);
        if (!exists) {
            return false;
        }

        await fs.writeFileSync(filePath, content);
        return true;
    },

    async deleteFile(filename){
        const filePath = getFilePath(filename);

        await fs.unlinkSync(filePath);
        return true;
    },
}

module.exports = fileController;