This folder enthält die Sequelize-Modeldefinitionen und deren Relationen.
`index.js` initialisiert die gemeinsame Sequelize-Instanz und bindet alle Models (Threads, Skeets, Medien, Reaktionen, Settings, PostSendLogs usw.) ein.
Andere Teile des Backends importieren ausschließlich aus diesem Verzeichnis, um konsistent auf die Datenbank zuzugreifen.
