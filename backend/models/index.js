// Load environment variables FIRST before any other requires
// Use explicit path to ensure .env is loaded from project root
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Sequelize } = require('sequelize');
const { getConfig } = require('../config/config');
const config = getConfig();

let dbConfig;

// Determine database dialect from environment variable, default to SQLite
const dbDialect = process.env.DB_DIALECT || 'sqlite';

if (dbDialect === 'mysql') {
    dbConfig = {
        dialect: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        database: process.env.DB_NAME || 'tududi',
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        logging: false,
        define: {
            timestamps: true,
            underscored: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    };
} else if (dbDialect === 'postgres' || dbDialect === 'postgresql') {
    dbConfig = {
        dialect: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'tududi',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        logging: false,
        define: {
            timestamps: true,
            underscored: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    };
} else {
    // Default to SQLite
    dbConfig = {
        dialect: 'sqlite',
        storage: config.dbFile,
        logging: false, // Disable SQL logging
        define: {
            timestamps: true,
            underscored: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    };
}

const sequelize = new Sequelize(dbConfig);

const User = require('./user')(sequelize);
const Area = require('./area')(sequelize);
const Project = require('./project')(sequelize);
const Task = require('./task')(sequelize);
const Tag = require('./tag')(sequelize);
const Note = require('./note')(sequelize);
const InboxItem = require('./inbox_item')(sequelize);
const TaskEvent = require('./task_event')(sequelize);
const Role = require('./role')(sequelize);
const Action = require('./action')(sequelize);
const Permission = require('./permission')(sequelize);
const ResearchJob = require('./research_job')(sequelize);
const BackgroundAgentJob = require('./background_agent_job')(sequelize);
const View = require('./view')(sequelize);
const ApiToken = require('./api_token')(sequelize);
const Setting = require('./setting')(sequelize);
const Notification = require('./notification')(sequelize);
const RecurringCompletion = require('./recurringCompletion')(sequelize);
const TaskAttachment = require('./task_attachment')(sequelize);
const Backup = require('./backup')(sequelize);

User.hasMany(Area, { foreignKey: 'user_id' });
Area.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Project, { foreignKey: 'user_id' });
Project.belongsTo(User, { foreignKey: 'user_id' });
Project.belongsTo(Area, { foreignKey: 'area_id', allowNull: true });
Area.hasMany(Project, { foreignKey: 'area_id' });

User.hasMany(Task, { foreignKey: 'user_id' });
Task.belongsTo(User, { foreignKey: 'user_id' });
Task.belongsTo(Project, { foreignKey: 'project_id', allowNull: true });
Project.hasMany(Task, { foreignKey: 'project_id' });

User.hasMany(Tag, { foreignKey: 'user_id' });
Tag.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Note, { foreignKey: 'user_id' });
Note.belongsTo(User, { foreignKey: 'user_id' });
Note.belongsTo(Project, { foreignKey: 'project_id', allowNull: true });
Project.hasMany(Note, { foreignKey: 'project_id' });

User.hasMany(InboxItem, { foreignKey: 'user_id' });
InboxItem.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(BackgroundAgentJob, { foreignKey: 'user_id' });
BackgroundAgentJob.belongsTo(User, { foreignKey: 'user_id' });

Task.hasMany(BackgroundAgentJob, {
    foreignKey: 'task_id',
    as: 'BackgroundAgentJobs',
});
BackgroundAgentJob.belongsTo(Task, { foreignKey: 'task_id', as: 'Task' });

// TaskEvent associations
User.hasMany(TaskEvent, { foreignKey: 'user_id', as: 'TaskEvents' });
TaskEvent.belongsTo(User, { foreignKey: 'user_id', as: 'User' });
Task.hasMany(TaskEvent, { foreignKey: 'task_id', as: 'TaskEvents' });
TaskEvent.belongsTo(Task, { foreignKey: 'task_id', as: 'Task' });

Task.belongsTo(Task, {
    as: 'ParentTask',
    foreignKey: 'parent_task_id',
});
Task.hasMany(Task, {
    as: 'Subtasks',
    foreignKey: 'parent_task_id',
});

Task.belongsTo(Task, {
    as: 'RecurringParent',
    foreignKey: 'recurring_parent_id',
});
Task.hasMany(Task, {
    as: 'RecurringChildren',
    foreignKey: 'recurring_parent_id',
});

Task.hasMany(RecurringCompletion, {
    as: 'Completions',
    foreignKey: 'task_id',
});
RecurringCompletion.belongsTo(Task, {
    foreignKey: 'task_id',
    as: 'Task',
});

Task.belongsToMany(Tag, {
    through: 'tasks_tags',
    foreignKey: 'task_id',
    otherKey: 'tag_id',
});
Tag.belongsToMany(Task, {
    through: 'tasks_tags',
    foreignKey: 'tag_id',
    otherKey: 'task_id',
});

Note.belongsToMany(Tag, {
    through: 'notes_tags',
    foreignKey: 'note_id',
    otherKey: 'tag_id',
});
Tag.belongsToMany(Note, {
    through: 'notes_tags',
    foreignKey: 'tag_id',
    otherKey: 'note_id',
});

Project.belongsToMany(Tag, {
    through: 'projects_tags',
    foreignKey: 'project_id',
    otherKey: 'tag_id',
});
Tag.belongsToMany(Project, {
    through: 'projects_tags',
    foreignKey: 'tag_id',
    otherKey: 'project_id',
});

User.hasOne(Role, { foreignKey: 'user_id' });
Role.belongsTo(User, { foreignKey: 'user_id' });

Permission.belongsTo(User, { foreignKey: 'user_id', as: 'User' });
Permission.belongsTo(User, {
    foreignKey: 'granted_by_user_id',
    as: 'GrantedBy',
});
Action.belongsTo(User, { foreignKey: 'actor_user_id', as: 'Actor' });
Action.belongsTo(User, { foreignKey: 'target_user_id', as: 'Target' });

User.hasMany(View, { foreignKey: 'user_id' });
View.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(ApiToken, { foreignKey: 'user_id', as: 'apiTokens' });
ApiToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Notification, { foreignKey: 'user_id', as: 'Notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

// TaskAttachment associations
User.hasMany(TaskAttachment, { foreignKey: 'user_id' });
TaskAttachment.belongsTo(User, { foreignKey: 'user_id' });
Task.hasMany(TaskAttachment, { foreignKey: 'task_id', as: 'Attachments' });
TaskAttachment.belongsTo(Task, { foreignKey: 'task_id' });

// Backup associations
User.hasMany(Backup, { foreignKey: 'user_id', as: 'Backups' });
Backup.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

module.exports = {
    sequelize,
    User,
    Area,
    Project,
    Task,
    Tag,
    Note,
    InboxItem,
    TaskEvent,
    Role,
    Action,
    Permission,
    ResearchJob,
    BackgroundAgentJob,
    View,
    ApiToken,
    Setting,
    Notification,
    RecurringCompletion,
    TaskAttachment,
    Backup,
};
