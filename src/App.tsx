import React, { useState } from 'react';
import SearchBar from './components/SearchBar';
import ApplicationGallery from './components/ApplicationGallery';
import './App.css';

const App: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Maqro</h1>
        <SearchBar onSearch={handleSearch} />
      </header>
      <main>
        <ApplicationGallery />
      </main>
    </div>
  );
};

export default App; 