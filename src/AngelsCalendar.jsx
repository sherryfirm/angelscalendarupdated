import React, { useState, useEffect } from 'react';
import { Calendar, Plus, User, Edit2, Trash2, X, ChevronLeft, ChevronRight, Zap, RefreshCw } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { initialCalendarItems } from './initialData';

const SportsEditorialCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(1);
  const [currentYear, setCurrentYear] = useState(2026);
  const [editingItem, setEditingItem] = useState(null);
  const [viewMode, setViewMode] = useState('month');
  const [addMode, setAddMode] = useState('single');
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvInput, setCsvInput] = useState('');
  const [calendarItems, setCalendarItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // State for day expansion modal
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);

  // State for day view - current day being viewed
  const [currentDayView, setCurrentDayView] = useState(new Date());

  // State for week view - start of current week being viewed
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    return new Date(now.setDate(diff));
  });

  // State for drag and drop
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  // ========================================
  // FIREBASE READ OPTIMIZATION WITH CACHING
  // ========================================
  // Strategy: Use localStorage cache + targeted once() reads
  // This reduces reads from ~100+/day to ~10-20/day
  // Cache is invalidated after 24 hours or manual refresh

  const CACHE_KEY = 'calendarItems_cache';
  const CACHE_TIMESTAMP_KEY = 'calendarItems_timestamp';
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // Load data from cache or Firebase
  const loadCalendarData = async (forceRefresh = false) => {
    setLoading(true);

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (cachedData && cacheTimestamp) {
        const age = Date.now() - parseInt(cacheTimestamp);
        if (age < CACHE_DURATION) {
          // Use cached data (0 Firebase reads!)
          console.log('📦 Using cached data (age: ' + Math.round(age / 1000 / 60) + ' minutes)');
          setCalendarItems(JSON.parse(cachedData));
          setLoading(false);
          return;
        }
      }
    }

    // Fetch from Firebase (1 read per document)
    console.log('🔄 Fetching from Firebase...');
    try {
      const snapshot = await getDocs(collection(db, 'calendarItems'));
      const items = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));

      // Update cache
      localStorage.setItem(CACHE_KEY, JSON.stringify(items));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());

      setCalendarItems(items);
      console.log('✅ Loaded ' + items.length + ' items from Firebase');
    } catch (error) {
      console.error('Error loading calendar data:', error);
      alert('Error loading calendar. Please try again.');
    }
    setLoading(false);
  };

  // Initial load on mount
  useEffect(() => {
    loadCalendarData();
  }, []);

  // Debounced cache update function (prevents rapid successive writes)
  const updateCacheDebounced = (() => {
    let timeout;
    return (items) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        localStorage.setItem(CACHE_KEY, JSON.stringify(items));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      }, 500);
    };
  })();

  // Update cache when items change
  useEffect(() => {
    if (calendarItems.length > 0) {
      updateCacheDebounced(calendarItems);
    }
  }, [calendarItems]);
  
  // Seed database with initial data (chunked upload)
  const seedDatabase = async () => {
    if (syncing) return;
    setSyncing(true);
    
    try {
      const totalItems = initialCalendarItems.length;
      let uploaded = 0;
      
      // Upload in chunks of 50
      const chunkSize = 50;
      for (let i = 0; i < totalItems; i += chunkSize) {
        const chunk = initialCalendarItems.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        chunk.forEach((item) => {
          const docRef = doc(collection(db, 'calendarItems'));
          const { id, ...itemData } = item;
          batch.set(docRef, itemData);
        });
        
        await batch.commit();
        uploaded += chunk.length;
        console.log(`Uploaded ${uploaded}/${totalItems} items`);
      }
      
      alert(`Successfully loaded ${totalItems} calendar items!`);
    } catch (error) {
      console.error('Error seeding database:', error);
      alert('Error loading schedule. Please try again.');
    }
    
    setSyncing(false);
  };
  
  const [newItem, setNewItem] = useState({
    date: '',
    type: null,
    title: '',
    assignees: [],
    status: 'planned',
    notes: '',
    links: '',
    themes: [],
    order: Date.now()
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Updated type options organized: Home, Away, then ROYGBIV order
  const typeOptions = [
    { value: 'home', label: 'HOME', color: '#ba0021' },
    { value: 'away', label: 'AWAY', color: '#666666' },
    { value: 'outofoffice', label: 'OUT OF OFFICE', color: '#f97316' },
    { value: 'content', label: 'CONTENT', color: '#eab308' },
    { value: 'event', label: 'EVENT', color: '#003263' },
    { value: 'promo', label: 'PROMO', color: '#6b21a8' },
    { value: 'sponsored', label: 'SPONSORED', color: '#0891b2' },
    { value: 'birthday', label: 'BIRTHDAY', color: '#ec4899' }
  ];

  // Day theme options with emojis
  const themeOptions = [
    { value: 'birthday', label: 'Birthday', emoji: '🎂' },
    { value: 'cityconnect', label: 'City Connect', emoji: '🏝️' },
    { value: 'holiday', label: 'Holiday', emoji: '🎉' },
    { value: 'special', label: 'Special Event', emoji: '⭐' }
  ];

  const statusOptions = ['planned', 'in-progress', 'review', 'completed'];

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const getItemsForDate = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarItems.filter(item => item.date === dateStr);
  };

  const handleAddItem = async () => {
    // Validate: require date AND (either title with type OR at least one theme)
    const hasTypeAndTitle = newItem.type && newItem.title;
    const hasThemes = newItem.themes && newItem.themes.length > 0;

    if (newItem.date && (hasTypeAndTitle || hasThemes)) {
      try {
        if (editingItem) {
          // Update existing item
          await updateDoc(doc(db, 'calendarItems', editingItem.id), newItem);
          // Optimistically update local state (0 additional reads)
          setCalendarItems(items => items.map(item =>
            item.id === editingItem.id ? { ...newItem, id: editingItem.id } : item
          ));
          setEditingItem(null);
        } else {
          // Add new item
          const docRef = await addDoc(collection(db, 'calendarItems'), { ...newItem, id: Date.now() });
          // Optimistically add to local state (0 additional reads)
          setCalendarItems(items => [...items, { ...newItem, id: docRef.id }]);
        }
        setNewItem({ date: '', type: null, title: '', assignees: [], status: 'planned', notes: '', links: '', themes: [], order: Date.now() });
        setShowImportModal(false);
      } catch (error) {
        console.error('Error saving item:', error);
        alert('Error saving item. Please try again.');
      }
    } else {
      alert('Please fill in required fields:\n- Date is required\n- Either select a Type with Title, or add at least one Theme');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setNewItem(item);
    setShowImportModal(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'calendarItems', id));
      // Optimistically remove from local state (0 additional reads)
      setCalendarItems(items => items.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error deleting item. Please try again.');
    }
  };

  const teamAbbreviations = {
    'Dodgers': 'LAD', 'Diamondbacks': 'ARI', 'Rangers': 'TEX', 'Giants': 'SF',
    'Rockies': 'COL', 'Padres': 'SD', 'Cubs': 'CHC', 'Reds': 'CIN',
    'Royals': 'KC', 'Mariners': 'SEA', 'Athletics': 'OAK', 'Guardians': 'CLE',
    'Brewers': 'MIL', 'White Sox': 'CWS', 'Astros': 'HOU', 'Braves': 'ATL',
    'Yankees': 'NYY', 'Blue Jays': 'TOR', 'Mets': 'NYM', 'Tigers': 'DET',
    'Rays': 'TB', 'Orioles': 'BAL', 'Red Sox': 'BOS', 'Twins': 'MIN',
    'Cardinals': 'STL', 'Marlins': 'MIA', 'Phillies': 'PHI', 'Pirates': 'PIT',
    'Nationals': 'WSH', 'Italy': 'ITA'
  };

  const handleImportCSV = async () => {
    try {
      const lines = csvInput.trim().split('\n');
      const newItems = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const [date, time, homeAway, opponent, location] = line.split(',').map(s => s.trim());
        
        if (date && opponent) {
          const opponentAbbr = teamAbbreviations[opponent] || opponent;
          
          newItems.push({
            id: Date.now() + i + Math.random(),
            date: date,
            type: 'game',
            title: `${homeAway.toLowerCase() === 'away' ? '@' : 'vs'} ${opponentAbbr}`,
            assignees: [],
            status: 'planned',
            notes: `${time ? time + ' - ' : ''}${location || ''}`,
            links: ''
          });
        }
      }
      
      // Add all items to Firebase
      for (const item of newItems) {
        await addDoc(collection(db, 'calendarItems'), item);
      }
      
      setCsvInput('');
      setShowImportModal(false);
      alert(`Successfully imported ${newItems.length} games!`);
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert('Error importing CSV. Please check the format.');
    }
  };

  const toggleAssignee = (name) => {
    const assignees = newItem.assignees.includes(name)
      ? newItem.assignees.filter(a => a !== name)
      : [...newItem.assignees, name];
    setNewItem({ ...newItem, assignees });
  };

  const teamMembers = ['Liam', 'Hannah', 'Ricardo', 'Alex', 'Interns'];

  // Handle clicking on a day to show modal with all events
  const handleDayClick = (day, items) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Always show day modal (will have add button for adding new items)
    setSelectedDay({
      day,
      date: dateStr,
      items
    });
    setShowDayModal(true);
  };

  // Open add item modal with pre-filled date
  const handleAddItemForDate = (dateStr) => {
    setShowDayModal(false);
    setEditingItem(null);
    setNewItem({
      date: dateStr,
      type: null,
      title: '',
      assignees: [],
      status: 'planned',
      notes: '',
      links: '',
      themes: [],
      order: Date.now()
    });
    setShowImportModal(true);
  };

  // Toggle theme selection
  const toggleTheme = (themeValue) => {
    const themes = newItem.themes?.includes(themeValue)
      ? newItem.themes.filter(t => t !== themeValue)
      : [...(newItem.themes || []), themeValue];
    setNewItem({ ...newItem, themes });
  };

  // Drag and drop handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
  };

  const handleDragOver = (e, item) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItem(item);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDrop = async (e, targetItem) => {
    e.preventDefault();

    if (!draggedItem || !targetItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Get all items for the same date, sorted by order
    const dateItems = calendarItems
      .filter(item => item.date === draggedItem.date && item.type && item.title)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Find indices
    const draggedIndex = dateItems.findIndex(item => item.id === draggedItem.id);
    const targetIndex = dateItems.findIndex(item => item.id === targetItem.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Reorder the items array
    const reorderedItems = [...dateItems];
    const [removed] = reorderedItems.splice(draggedIndex, 1);
    reorderedItems.splice(targetIndex, 0, removed);

    // Update order values for all items on this date
    try {
      const batch = writeBatch(db);
      reorderedItems.forEach((item, index) => {
        const itemRef = doc(db, 'calendarItems', item.id);
        batch.update(itemRef, { order: index });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error reordering items:', error);
      alert('Error reordering items. Please try again.');
    }

    setDraggedItem(null);
    setDragOverItem(null);
  };

  // Get background and text colors for item types
  const getItemColors = (type) => {
    const bgColors = {
      home: 'bg-red-600',
      away: 'bg-zinc-600',
      game: 'bg-red-600',
      outofoffice: 'bg-orange-500',
      promo: 'bg-purple-800',
      sponsored: 'bg-cyan-600',
      content: 'bg-yellow-500',
      event: 'bg-blue-950',
      birthday: 'bg-pink-500'
    };
    const textColors = {
      home: 'text-white',
      away: 'text-white',
      game: 'text-white',
      outofoffice: 'text-white',
      promo: 'text-white',
      sponsored: 'text-white',
      content: 'text-zinc-900',
      event: 'text-white',
      birthday: 'text-white'
    };
    return { bg: bgColors[type] || 'bg-gray-500', text: textColors[type] || 'text-white' };
  };

  // Get all themes for a specific date
  const getThemesForDate = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayItems = calendarItems.filter(item => item.date === dateStr);
    const allThemes = new Set();

    dayItems.forEach(item => {
      // Add manually selected themes
      if (item.themes && Array.isArray(item.themes)) {
        item.themes.forEach(theme => allThemes.add(theme));
      }

      // Auto-add birthday theme for birthday type items
      if (item.type === 'birthday') {
        allThemes.add('birthday');
      }

      // Auto-add city connect theme for "beach weekend" events
      if (item.title && item.title.toLowerCase().includes('beach weekend')) {
        allThemes.add('cityconnect');
      }
    });

    return Array.from(allThemes);
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="min-h-24 bg-zinc-900/50 rounded-lg opacity-40"></div>
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const items = getItemsForDate(day);
      const dayThemes = getThemesForDate(day);
      const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
      const hasGame = items.some(item => item.type === 'game' || item.type === 'home' || item.type === 'away');

      days.push(
        <div
          key={day}
          className={`group min-h-24 rounded-lg p-2 transition-all duration-200 hover:scale-105 cursor-pointer
            ${isToday ? 'ring-2 ring-red-600 bg-gradient-to-br from-red-900/30 to-zinc-900' : 'bg-zinc-900 hover:bg-zinc-800'}
            ${hasGame && !isToday ? 'bg-gradient-to-br from-red-900/20 to-zinc-900' : ''}
            ${items.length === 0 ? 'hover:ring-1 hover:ring-red-500/50' : ''}`}
          onClick={() => handleDayClick(day, items)}
          title={items.length === 0 ? 'Click to add new item' : `${items.length} item(s) - Click to view`}
        >
          <div className={`font-bold text-lg mb-1 flex items-center justify-between ${isToday ? 'text-red-500' : 'text-zinc-500'}`}
               style={{ fontFamily: "'Oswald', sans-serif" }}>
            <div className="flex items-center gap-1">
              {day}
              {dayThemes.map(theme => {
                const themeOption = themeOptions.find(t => t.value === theme);
                return themeOption ? <span key={theme} className="text-base">{themeOption.emoji}</span> : null;
              })}
            </div>
            <Plus size={16} className="text-zinc-600 group-hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" />
          </div>
          <div className="flex flex-col gap-1">
            {items.filter(item => item.type && item.title).sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, 3).map(item => {
              const colors = getItemColors(item.type);
              const showSmallDesc = item.type === 'home' || item.type === 'away';
              const isDragging = draggedItem?.id === item.id;
              const isDragOver = dragOverItem?.id === item.id;
              return (
                <div key={item.id} className="flex flex-col gap-0.5">
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragOver={(e) => handleDragOver(e, item)}
                    onDrop={(e) => handleDrop(e, item)}
                    onDragEnd={handleDragEnd}
                    className={`${colors.bg} ${colors.text} px-2 py-1 rounded cursor-move
                      hover:opacity-90 transition-all font-semibold tracking-wide uppercase flex flex-col gap-0 min-w-0
                      ${isDragging ? 'opacity-50 scale-95' : ''}
                      ${isDragOver ? 'ring-2 ring-white' : ''}`}
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: '12px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(item);
                    }}
                    title={`${item.title} (drag to reorder)`}
                  >
                    <span className="truncate">{item.title}</span>
                    {showSmallDesc && item.notes && (
                      <span className="text-[11px] text-zinc-300 truncate font-normal normal-case" style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0' }}>
                        {item.notes}
                      </span>
                    )}
                  </div>
                  {item.assignees && item.assignees.length > 0 && (
                    <div className="flex gap-0.5 px-1">
                      {item.assignees.slice(0, 3).map((assignee, idx) => (
                        <div
                          key={idx}
                          className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-[8px] font-bold text-white"
                          title={assignee}
                        >
                          {assignee.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {item.assignees.length > 3 && (
                        <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[7px] font-bold text-white">
                          +{item.assignees.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {items.filter(item => item.type && item.title).length > 3 && (
              <div
                className="text-pink-400 text-xs font-semibold hover:text-pink-300 cursor-pointer"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDayClick(day, items);
                }}
              >
                +{items.filter(item => item.type && item.title).length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  // Render Week View
  const renderWeekView = () => {
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      weekDays.push(date);
    }

    return (
      <div className="space-y-4">
        {/* Week navigation header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              const newDate = new Date(currentWeekStart);
              newDate.setDate(currentWeekStart.getDate() - 7);
              setCurrentWeekStart(newDate);
            }}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h3 className="text-xl font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>
            {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </h3>
          <button
            onClick={() => {
              const newDate = new Date(currentWeekStart);
              newDate.setDate(currentWeekStart.getDate() + 7);
              setCurrentWeekStart(newDate);
            }}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((date, idx) => {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const items = calendarItems.filter(item => item.date === dateStr);
            const dayThemes = (() => {
              const allThemes = new Set();
              items.forEach(item => {
                if (item.themes && Array.isArray(item.themes)) {
                  item.themes.forEach(theme => allThemes.add(theme));
                }
              });
              return Array.from(allThemes);
            })();
            const isToday = date.toDateString() === new Date().toDateString();
            const hasGame = items.some(item => item.type === 'game' || item.type === 'home' || item.type === 'away');

            return (
              <div
                key={idx}
                className={`group rounded-lg p-3 transition-all cursor-pointer hover:scale-105 min-h-[200px]
                  ${isToday ? 'ring-2 ring-red-600 bg-gradient-to-br from-red-900/30 to-zinc-900' : 'bg-zinc-900 hover:bg-zinc-800'}
                  ${hasGame && !isToday ? 'bg-gradient-to-br from-red-900/20 to-zinc-900' : ''}`}
                onClick={() => {
                  setSelectedDay({
                    day: date.getDate(),
                    date: dateStr,
                    items
                  });
                  setShowDayModal(true);
                }}
              >
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <div className={`text-xs uppercase font-semibold ${isToday ? 'text-red-400' : 'text-zinc-500'}`} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][idx]}
                    </div>
                    <Plus size={14} className="text-zinc-600 group-hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" />
                  </div>
                  <div className={`text-2xl font-bold flex items-center gap-1 ${isToday ? 'text-red-500' : 'text-white'}`} style={{ fontFamily: "'Oswald', sans-serif" }}>
                    {date.getDate()}
                    {dayThemes.map(theme => {
                      const themeOption = themeOptions.find(t => t.value === theme);
                      return themeOption ? <span key={theme} className="text-lg">{themeOption.emoji}</span> : null;
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  {items.filter(item => item.type && item.title).sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => {
                    const colors = getItemColors(item.type);
                    const isDragging = draggedItem?.id === item.id;
                    const isDragOver = dragOverItem?.id === item.id;
                    return (
                      <div key={item.id} className="flex flex-col gap-0.5">
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onDragOver={(e) => handleDragOver(e, item)}
                          onDrop={(e) => handleDrop(e, item)}
                          onDragEnd={handleDragEnd}
                          className={`${colors.bg} ${colors.text} px-2 py-1 rounded text-xs font-semibold uppercase truncate cursor-move hover:opacity-90 transition-all
                            ${isDragging ? 'opacity-50 scale-95' : ''}
                            ${isDragOver ? 'ring-2 ring-white' : ''}`}
                          style={{
                            fontFamily: "'Barlow Condensed', sans-serif"
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(item);
                          }}
                          title={`${item.title} (drag to reorder)`}
                        >
                          {item.title}
                        </div>
                        {item.assignees && item.assignees.length > 0 && (
                          <div className="flex gap-0.5 px-1">
                            {item.assignees.slice(0, 3).map((assignee, idx) => (
                              <div
                                key={idx}
                                className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-[8px] font-bold text-white"
                                title={assignee}
                              >
                                {assignee.charAt(0).toUpperCase()}
                              </div>
                            ))}
                            {item.assignees.length > 3 && (
                              <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[7px] font-bold text-white">
                                +{item.assignees.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {items.filter(item => item.type && item.title).length === 0 && (
                    <div className="text-zinc-600 text-xs text-center py-2">No events</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Day View
  const renderDayView = () => {
    const dateStr = `${currentDayView.getFullYear()}-${String(currentDayView.getMonth() + 1).padStart(2, '0')}-${String(currentDayView.getDate()).padStart(2, '0')}`;
    const items = calendarItems.filter(item => item.date === dateStr);
    const formattedDate = currentDayView.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Day navigation header */}
        <div className="flex items-center justify-between mb-6 bg-zinc-900 rounded-lg p-4 group">
          <button
            onClick={() => {
              const newDate = new Date(currentDayView);
              newDate.setDate(currentDayView.getDate() - 1);
              setCurrentDayView(newDate);
            }}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-3">
              <h3 className="text-2xl font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>
                {formattedDate}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddItemForDate(dateStr);
                }}
                className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-white"
                title="Add item for this day"
              >
                <Plus size={20} />
              </button>
            </div>
            <p className="text-zinc-400 text-sm mt-1">{items.filter(item => item.type && item.title).length} event{items.filter(item => item.type && item.title).length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => {
              const newDate = new Date(currentDayView);
              newDate.setDate(currentDayView.getDate() + 1);
              setCurrentDayView(newDate);
            }}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Events list */}
        <div className="space-y-3">
          {items.filter(item => item.type && item.title).length === 0 ? (
            <div className="text-center py-12 bg-zinc-900 rounded-lg">
              <p className="text-zinc-400 mb-4">No events scheduled for this day</p>
            </div>
          ) : (
            items.filter(item => item.type && item.title).sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => {
              const colors = getItemColors(item.type);
              const typeLabel = typeOptions.find(t => t.value === item.type)?.label || item.type.toUpperCase();
              const isDragging = draggedItem?.id === item.id;
              const isDragOver = dragOverItem?.id === item.id;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragOver={(e) => handleDragOver(e, item)}
                  onDrop={(e) => handleDrop(e, item)}
                  onDragEnd={handleDragEnd}
                  className={`bg-zinc-900 rounded-lg p-6 hover:bg-zinc-800 transition-all group cursor-move
                    ${isDragging ? 'opacity-50 scale-95' : ''}
                    ${isDragOver ? 'ring-2 ring-red-500' : ''}`}
                  title="Drag to reorder"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Type Badge */}
                      <span
                        className={`${colors.bg} ${colors.text} text-sm px-3 py-1 rounded font-semibold inline-block mb-3`}
                        style={{
                          fontFamily: "'Barlow Condensed', sans-serif"
                        }}
                      >
                        {typeLabel}
                      </span>

                      {/* Title */}
                      <h4 className="text-white font-bold text-2xl mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                        {item.title}
                      </h4>

                      {/* Notes */}
                      {item.notes && (
                        <p className="text-zinc-400 mt-2">{item.notes}</p>
                      )}

                      {/* Post Link */}
                      {item.links && (
                        <a
                          href={item.links}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-2 text-red-400 hover:text-red-300 text-sm font-semibold transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                          </svg>
                          View Post
                        </a>
                      )}

                      {/* Assignees */}
                      {item.assignees && item.assignees.length > 0 && (
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex -space-x-2">
                            {item.assignees.map((assignee, idx) => (
                              <div
                                key={idx}
                                className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-sm font-bold text-white border-2 border-zinc-900 hover:scale-110 transition-transform cursor-help"
                                title={assignee}
                              >
                                {assignee.charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.assignees.map(assignee => (
                              <span key={assignee} className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-300">
                                {assignee}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      <div className="mt-3">
                        <span className={`text-xs px-2 py-1 rounded font-semibold uppercase ${
                          item.status === 'completed' ? 'bg-green-900/50 text-green-300' :
                          item.status === 'in-progress' ? 'bg-blue-900/50 text-blue-300' :
                          item.status === 'review' ? 'bg-yellow-900/50 text-yellow-300' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-300 hover:text-white transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this item?')) {
                            handleDelete(item.id);
                          }
                        }}
                        className="p-3 bg-zinc-700 hover:bg-red-600 rounded-lg text-zinc-300 hover:text-white transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // Navigate to previous/next day in modal
  const navigateDayModal = (direction) => {
    if (!selectedDay) return;

    const currentDate = new Date(selectedDay.date + 'T12:00:00');
    currentDate.setDate(currentDate.getDate() + direction);

    const newDay = currentDate.getDate();
    const newMonth = currentDate.getMonth();
    const newYear = currentDate.getFullYear();

    // Update current month/year if needed
    if (newMonth !== currentMonth || newYear !== currentYear) {
      setCurrentMonth(newMonth);
      setCurrentYear(newYear);
    }

    const dateStr = `${newYear}-${String(newMonth + 1).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
    const items = calendarItems.filter(item => item.date === dateStr);

    setSelectedDay({
      day: newDay,
      date: dateStr,
      items
    });
  };

  // Day Modal Component - Shows all events for a selected day
  const DayModal = () => {
    if (!showDayModal || !selectedDay) return null;

    const dateObj = new Date(selectedDay.date + 'T12:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-900 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden border border-zinc-700 shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-700 to-red-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => navigateDayModal(-1)}
                className="text-white hover:text-red-200 transition-colors p-2 hover:bg-red-800/50 rounded-lg"
                title="Previous day"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="text-center flex-1">
                <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  {formattedDate}
                </h3>
                <p className="text-red-200 text-sm">{selectedDay.items.length} item{selectedDay.items.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => navigateDayModal(1)}
                className="text-white hover:text-red-200 transition-colors p-2 hover:bg-red-800/50 rounded-lg"
                title="Next day"
              >
                <ChevronRight size={24} />
              </button>
            </div>
            <button
              onClick={() => setShowDayModal(false)}
              className="absolute top-4 right-4 text-white hover:text-red-200 transition-colors p-2"
            >
              <X size={24} />
            </button>
          </div>

          {/* Events List */}
          <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
            {selectedDay.items.length === 0 ? (
              <div className="text-center py-8 text-zinc-400">
                <p className="mb-4">No events for this day</p>
                <button
                  onClick={() => handleAddItemForDate(selectedDay.date)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  <Plus size={16} />
                  ADD ITEM
                </button>
              </div>
            ) : (
              <>
              {/* Theme-only items */}
              {selectedDay.items.filter(item => !item.type && !item.title && item.themes?.length > 0).sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => (
                <div
                  key={item.id}
                  className="bg-zinc-800/50 border-2 border-dashed border-zinc-700 rounded-lg p-3 hover:bg-zinc-800 transition-all group"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-xs font-semibold uppercase">Day Theme:</span>
                      <div className="flex gap-1">
                        {item.themes?.map(themeValue => {
                          const theme = themeOptions.find(t => t.value === themeValue);
                          return theme ? (
                            <span key={themeValue} className="text-lg" title={theme.label}>
                              {theme.emoji}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setShowDayModal(false);
                          handleEdit(item);
                        }}
                        className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-300 hover:text-white transition-colors"
                        title="Edit theme"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this theme?')) {
                            handleDelete(item.id);
                          }
                        }}
                        className="p-2 bg-zinc-700 hover:bg-red-600 rounded-lg text-zinc-300 hover:text-white transition-colors"
                        title="Delete theme"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Regular items */}
              {selectedDay.items.filter(item => item.type && item.title).sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => {
                const colors = getItemColors(item.type);
                const typeLabel = typeOptions.find(t => t.value === item.type)?.label || item.type.toUpperCase();
                const isDragging = draggedItem?.id === item.id;
                const isDragOver = dragOverItem?.id === item.id;

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragOver={(e) => handleDragOver(e, item)}
                    onDrop={(e) => handleDrop(e, item)}
                    onDragEnd={handleDragEnd}
                    className={`bg-zinc-800 rounded-lg p-4 hover:bg-zinc-750 transition-all group cursor-move
                      ${isDragging ? 'opacity-50 scale-95' : ''}
                      ${isDragOver ? 'ring-2 ring-red-500' : ''}`}
                    title="Drag to reorder"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        {/* Type Badge */}
                        <span
                          className={`${colors.bg} ${colors.text} text-xs px-2 py-1 rounded font-semibold inline-block mb-2`}
                          style={{
                            fontFamily: "'Barlow Condensed', sans-serif"
                          }}
                        >
                          {typeLabel}
                        </span>

                        {/* Title */}
                        <h4 className="text-white font-bold text-lg" style={{ fontFamily: "'Oswald', sans-serif" }}>
                          {item.title}
                        </h4>

                        {/* Notes */}
                        {item.notes && (
                          <p className="text-zinc-400 text-sm mt-1">{item.notes}</p>
                        )}

                        {/* Post Link */}
                        {item.links && (
                          <a
                            href={item.links}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-red-400 hover:text-red-300 text-xs font-semibold transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                            </svg>
                            View Post
                          </a>
                        )}

                        {/* Assignees */}
                        {item.assignees && item.assignees.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {item.assignees.map((assignee, idx) => (
                              <div
                                key={idx}
                                className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-[9px] font-bold text-white"
                                title={assignee}
                              >
                                {assignee.charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setShowDayModal(false);
                            handleEdit(item);
                          }}
                          className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-300 hover:text-white transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this item?')) {
                              handleDelete(item.id);
                            }
                          }}
                          className="p-2 bg-zinc-700 hover:bg-red-600 rounded-lg text-zinc-300 hover:text-white transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-700 flex justify-between gap-2">
            {selectedDay.items.length > 0 && (
              <button
                onClick={() => handleAddItemForDate(selectedDay.date)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                <Plus size={16} />
                ADD ITEM
              </button>
            )}
            <button
              onClick={() => setShowDayModal(false)}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-semibold transition-colors ml-auto"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Day Modal */}
      <DayModal />
      
      {/* Header with Background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-700/40 via-zinc-900 to-zinc-950"></div>
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '100% auto',
            backgroundPosition: '70% 40%'
          }}
        >
        </div>
        
        {/* Mobile-responsive header: stack on small screens */}
        <div className="relative z-10 p-4 sm:p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <img src="/logo.png" alt="Angels Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight" style={{ fontFamily: "'Oswald', sans-serif" }}>
                @ANGELS CALENDAR
              </h1>
              <p className="text-red-300 text-xs sm:text-sm font-semibold tracking-widest uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                2026 Season Schedule
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            {calendarItems.length === 0 && (
              <button
                onClick={seedDatabase}
                disabled={syncing}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700
                  hover:from-green-500 hover:to-green-600 text-white font-bold rounded-lg transition-all
                  shadow-lg hover:shadow-green-500/25 disabled:opacity-50"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em' }}
              >
                <Calendar size={18} />
                {syncing ? 'SYNCING...' : 'LOAD SCHEDULE'}
              </button>
            )}
            {/* Manual Refresh Button - Forces Firebase reload */}
            <button
              onClick={() => loadCalendarData(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-lg transition-all disabled:opacity-50"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em' }}
              title="Refresh data from server"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">REFRESH</span>
            </button>
            <button
              onClick={() => {
                setEditingItem(null);
                setNewItem({ date: '', type: null, title: '', assignees: [], status: 'planned', notes: '', links: '', themes: [], order: Date.now() });
                setShowImportModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700
                hover:from-red-500 hover:to-red-600 text-white font-bold rounded-lg transition-all
                shadow-lg hover:shadow-red-500/25"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em' }}
            >
              <Plus size={18} />
              <span className="hidden sm:inline">ADD ITEM</span>
              <span className="sm:hidden">ADD</span>
            </button>
          </div>
        </div>
      </div>

      {/* Month Navigation - Mobile Responsive */}
      <div className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between border-b border-zinc-800 gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
          {/* Month/Year Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (currentMonth === 0) {
                  setCurrentMonth(11);
                  setCurrentYear(currentYear - 1);
                } else {
                  setCurrentMonth(currentMonth - 1);
                }
              }}
              className="p-3 hover:bg-zinc-800 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Previous month"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold min-w-[140px] sm:min-w-[180px] text-center" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {months[currentMonth]} {currentYear}
            </h2>
            <button
              onClick={() => {
                if (currentMonth === 11) {
                  setCurrentMonth(0);
                  setCurrentYear(currentYear + 1);
                } else {
                  setCurrentMonth(currentMonth + 1);
                }
              }}
              className="p-3 hover:bg-zinc-800 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Next month"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2 sm:border-l border-zinc-700 sm:pl-4">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 sm:px-4 py-2.5 rounded-lg font-semibold transition-all text-sm min-h-[44px] ${
                viewMode === 'month'
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
              }`}
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              MONTH
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 sm:px-4 py-2.5 rounded-lg font-semibold transition-all text-sm min-h-[44px] ${
                viewMode === 'week'
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
              }`}
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              WEEK
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 sm:px-4 py-2.5 rounded-lg font-semibold transition-all text-sm min-h-[44px] ${
                viewMode === 'day'
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
              }`}
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              DAY
            </button>
          </div>
        </div>

        {/* Legend - Scrollable on mobile */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center sm:justify-start overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {typeOptions.map(type => (
            <div key={type.value} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: type.color }}
              ></div>
              <span className="text-xs text-zinc-400 uppercase font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {type.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Views - Mobile Responsive */}
      <div className="p-3 sm:p-4 md:p-6 lg:p-8">
        {viewMode === 'month' && (
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <div className="min-w-[640px] sm:min-w-0">
              {/* Day labels */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 px-3 sm:px-0">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, idx) => (
                  <div key={day} className="text-center py-2 text-zinc-500 font-bold text-xs sm:text-sm" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.charAt(0)}</span>
                  </div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 px-3 sm:px-0">
                {renderCalendarGrid()}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'week' && renderWeekView()}

        {viewMode === 'day' && renderDayView()}
      </div>

      {/* Add/Edit Modal - Full screen on mobile */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-zinc-900 rounded-none sm:rounded-2xl p-4 sm:p-6 w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[90vh] overflow-y-auto border-0 sm:border border-zinc-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>
                {editingItem ? 'EDIT ITEM' : 'ADD NEW ITEM'}
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setEditingItem(null);
                }}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Mode Toggle */}
            {!editingItem && (
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setAddMode('single')}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                    addMode === 'single' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  SINGLE ITEM
                </button>
                <button
                  onClick={() => setAddMode('import')}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                    addMode === 'import' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  IMPORT CSV
                </button>
              </div>
            )}

            {(addMode === 'single' || editingItem) ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-400 mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>DATE</label>
                  <input
                    type="date"
                    value={newItem.date}
                    onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-zinc-400 mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>TYPE</label>
                  <div className="flex flex-wrap gap-2">
                    {typeOptions.map(type => (
                      <button
                        key={type.value}
                        onClick={() => setNewItem({ ...newItem, type: newItem.type === type.value ? null : type.value })}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                          newItem.type === type.value
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: type.color,
                          color: type.value === 'content' || type.value === 'cityconnect' ? '#27272a' : 'white',
                          fontFamily: "'Barlow Condensed', sans-serif"
                        }}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-zinc-400 mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>TITLE</label>
                  <input
                    type="text"
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter title..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-zinc-400 mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>NOTES</label>
                  <textarea
                    value={newItem.notes}
                    onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 h-20 resize-none"
                    placeholder="Additional notes..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-400 mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>POST LINK</label>
                  <input
                    type="url"
                    value={newItem.links}
                    onChange={(e) => setNewItem({ ...newItem, links: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-400 mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>DAY THEMES</label>
                  <div className="flex flex-wrap gap-2">
                    {themeOptions.map(theme => (
                      <button
                        key={theme.value}
                        onClick={() => toggleTheme(theme.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          newItem.themes?.includes(theme.value)
                            ? 'bg-red-600 text-white ring-2 ring-white ring-offset-2 ring-offset-zinc-900'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                        }`}
                      >
                        <span className="text-lg">{theme.emoji}</span>
                        {theme.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-400 mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>ASSIGNEES</label>
                  <div className="flex flex-wrap gap-2">
                    {teamMembers.map(member => (
                      <button
                        key={member}
                        onClick={() => toggleAssignee(member)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-all ${
                          newItem.assignees.includes(member)
                            ? 'bg-red-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <User size={14} />
                        {member}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-zinc-400 mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>STATUS</label>
                  <select
                    value={newItem.status}
                    onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={handleAddItem}
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 
                    text-white font-bold rounded-lg transition-all mt-4"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em' }}
                >
                  {editingItem ? 'UPDATE ITEM' : 'ADD ITEM'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-400 mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    PASTE CSV DATA
                  </label>
                  <p className="text-xs text-zinc-500 mb-2">Format: date,time,home/away,opponent,location</p>
                  <textarea
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 h-40 resize-none font-mono text-sm"
                    placeholder="date,time,home/away,opponent,location
2026-04-03,7:07 PM,Home,Mariners,Angel Stadium"
                  />
                </div>
                
                <button
                  onClick={handleImportCSV}
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 
                    text-white font-bold rounded-lg transition-all"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em' }}
                >
                  IMPORT GAMES
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SportsEditorialCalendar;
