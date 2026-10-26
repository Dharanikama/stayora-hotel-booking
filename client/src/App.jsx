import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, Compass, Heart, Hotel, Menu, Search, ShieldCheck, Sparkles, Star, Users, Wifi, Coffee, Waves, X, LogOut, UserRound, BedDouble, SlidersHorizontal, Clock3, MapPin } from 'lucide-react';

const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const fallbackRooms = [
  { _id: 'demo1', name: 'The Solstice Suite', type: 'Suite', description: 'A calm, sunlit suite with generous space, thoughtful details, and a private lounge area.', pricePerNight: 7499, capacity: 2, beds: '1 king bed', size: 52, image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85', amenities: ['Wi-Fi', 'King bed', 'Rain shower', 'Breakfast'], rating: 4.9, featured: true },
  { _id: 'demo2', name: 'Garden Deluxe', type: 'Deluxe', description: 'A serene room with warm textures, garden views, and everything you need for a restful stay.', pricePerNight: 4299, capacity: 2, beds: '1 queen bed', size: 34, image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85', amenities: ['Wi-Fi', 'Garden view', 'Smart TV', 'Breakfast'], rating: 4.8, featured: true },
  { _id: 'demo3', name: 'Cloud Nine Twin', type: 'Standard', description: 'A beautifully simple room for easy city breaks, with soft bedding and a clean modern finish.', pricePerNight: 2899, capacity: 2, beds: '2 twin beds', size: 25, image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85', amenities: ['Wi-Fi', 'Work desk', 'Smart TV'], rating: 4.6 },
  { _id: 'demo4', name: 'The Family Hideaway', type: 'Family', description: 'Room for everyone to unwind, with flexible sleeping arrangements and space to gather.', pricePerNight: 5899, capacity: 4, beds: '1 king + 2 twin beds', size: 46, image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85', amenities: ['Wi-Fi', 'Family space', 'Mini fridge', 'Breakfast'], rating: 4.8, featured: true },
  { _id: 'demo5', name: 'Midnight Atelier', type: 'Deluxe', description: 'An intimate, design-led room with moody accents, soft lighting, and premium comforts.', pricePerNight: 4599, capacity: 2, beds: '1 queen bed', size: 32, image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=85', amenities: ['Wi-Fi', 'Rain shower', 'Smart TV'], rating: 4.7 },
  { _id: 'demo6', name: 'Horizon Penthouse', type: 'Suite', description: 'An elevated escape with expansive windows, a separate sitting area, and a little extra luxury.', pricePerNight: 9999, capacity: 3, beds: '1 king bed + sofa bed', size: 68, image: 'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?auto=format&fit=crop&w=1200&q=85', amenities: ['Wi-Fi', 'City view', 'Lounge', 'Breakfast'], rating: 5.0, featured: true }
];
const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const dateStr = d => d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select date';
const today = new Date().toLocaleDateString('en-CA');
const emptyRoom = { name: '', type: 'Deluxe', pricePerNight: '', capacity: '2', image: '', description: '', amenities: '' };

function App() {
  const [rooms, setRooms] = useState(fallbackRooms);
  const [apiReady, setApiReady] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');
  const [guests, setGuests] = useState('2');
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toLocaleDateString('en-CA'); });
  const [sort, setSort] = useState('recommended');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('stayora_user')); } catch { return null; } });
  const [token, setToken] = useState(() => localStorage.getItem('stayora_token') || '');
  const [notice, setNotice] = useState('');
  const [bookings, setBookings] = useState([]);
  const [busy, setBusy] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [bookingGuests, setBookingGuests] = useState('2');
  const [pendingRoom, setPendingRoom] = useState(null);
  const [adminBookings, setAdminBookings] = useState([]);
  const [adminRooms, setAdminRooms] = useState([]);
  const [roomForm, setRoomForm] = useState(emptyRoom);

  async function request(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && token && !path.startsWith('/auth/')) expireSession();
    if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
    return data;
  }

  function expireSession() {
    localStorage.removeItem('stayora_token'); localStorage.removeItem('stayora_user');
    setToken(''); setUser(null); setBookings([]); setAdminBookings([]); setAdminRooms([]); setModal('');
    setNotice('Your session expired. Please sign in again.');
  }

  async function loadRooms() {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (type !== 'All') params.set('type', type);
    if (guests) params.set('guests', guests);
    if (checkIn && checkOut && checkOut > checkIn) { params.set('checkIn', checkIn); params.set('checkOut', checkOut); }
    try {
      const data = await request(`/rooms?${params}`);
      setRooms(data.rooms);
      setApiReady(true);
    } catch {
      setApiReady(false);
      setRooms(fallbackRooms.filter(r => (type === 'All' || r.type === type) && r.capacity >= Number(guests) && (!search || `${r.name} ${r.description} ${r.amenities.join(' ')}`.toLowerCase().includes(search.toLowerCase()))));
    }
  }

  useEffect(() => { loadRooms(); }, [type, guests, checkIn, checkOut]);
  useEffect(() => {
    const t = setTimeout(loadRooms, 250);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { if (token) loadBookings(); }, [token]);

  async function loadBookings() {
    try { const data = await request('/bookings/my'); setBookings(data.bookings || []); } catch { setBookings([]); }
  }

  const visibleRooms = useMemo(() => [...rooms].sort((a, b) => sort === 'price-low' ? a.pricePerNight - b.pricePerNight : sort === 'price-high' ? b.pricePerNight - a.pricePerNight : sort === 'rating' ? b.rating - a.rating : Number(b.featured) - Number(a.featured)), [rooms, sort]);

  async function submitAuth(e) {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      const data = await request(`/auth/${authMode}`, { method: 'POST', body: JSON.stringify(authForm) });
      setToken(data.token); setUser(data.user);
      localStorage.setItem('stayora_token', data.token); localStorage.setItem('stayora_user', JSON.stringify(data.user));
      setAuthForm({ name: '', email: '', password: '' });
      if (pendingRoom) { setSelected(pendingRoom); setBookingGuests(String(Math.min(Number(guests) || 2, pendingRoom.capacity))); setPendingRoom(null); setModal('room'); } else setModal('');
      setNotice(`Welcome${data.user.name ? `, ${data.user.name.split(' ')[0]}` : ''}! You're signed in.`);
    } catch (err) { setNotice(err.message); }
    finally { setBusy(false); }
  }

  async function bookRoom(room) {
    if (!user) { setPendingRoom(room); setAuthMode('login'); setModal('auth'); return; }
    if (!apiReady || String(room._id).startsWith('demo')) { setNotice('Connect the MongoDB backend to confirm a real booking. The demo room catalogue is currently in preview mode.'); return; }
    setBusy(true); setNotice('');
    try {
      await request('/bookings', { method: 'POST', body: JSON.stringify({ roomId: room._id, checkIn, checkOut, guests: Number(bookingGuests) }) });
      setNotice('Your stay is confirmed! You can find it under My trips.');
      setModal(''); setSelected(null); await loadRooms(); await loadBookings();
    } catch (err) { setNotice(err.message); }
    finally { setBusy(false); }
  }

  async function cancelBooking(id) {
    try { await request(`/bookings/${id}/cancel`, { method: 'PATCH' }); setNotice('Booking cancelled.'); await loadBookings(); await loadRooms(); }
    catch (err) { setNotice(err.message); }
  }

  function logout() {
    localStorage.removeItem('stayora_token'); localStorage.removeItem('stayora_user');
    setToken(''); setUser(null); setBookings([]); setAdminBookings([]); setAdminRooms([]); setModal(''); setNotice('You have been signed out.');
  }

  async function loadAdmin() {
    try {
      const [b, r] = await Promise.all([request('/admin/bookings'), request('/admin/rooms')]);
      setAdminBookings(b.bookings || []); setAdminRooms(r.rooms || []);
    } catch (err) { setNotice(err.message); }
  }
  async function adminCancel(id) {
    try { await request(`/bookings/${id}/cancel`, { method: 'PATCH' }); setNotice('Booking cancelled.'); await loadAdmin(); await loadRooms(); }
    catch (err) { setNotice(err.message); }
  }
  async function toggleRoom(room) {
    try { await request(`/admin/rooms/${room._id}`, { method: 'PATCH', body: JSON.stringify({ active: !room.active }) }); await loadAdmin(); await loadRooms(); }
    catch (err) { setNotice(err.message); }
  }
  async function addRoom(e) {
    e.preventDefault(); setBusy(true);
    try {
      await request('/admin/rooms', { method: 'POST', body: JSON.stringify({ ...roomForm, image: roomForm.image.trim() || fallbackRooms[0].image }) });
      setRoomForm(emptyRoom); setNotice('Room added.'); await loadAdmin(); await loadRooms();
    } catch (err) { setNotice(err.message); }
    finally { setBusy(false); }
  }

  const openRoom = room => { setSelected(room); setBookingGuests(String(Math.min(Number(guests) || 2, room.capacity))); setModal('room'); };
  const nights = checkIn && checkOut && checkOut > checkIn ? Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000) : 0;

  return <div className="app-shell">
    <div className="announcement"><Sparkles size={14}/> A more thoughtful way to get away <span className="announcement-dot">•</span> Curated stays, made simple</div>
    <header className="nav-wrap">
      <nav className="nav container">
        <a href="#" className="brand" onClick={e => { e.preventDefault(); window.scrollTo({top:0,behavior:'smooth'}); }}><span className="brand-mark"><Hotel size={19}/></span><span>stayora<span className="brand-period">.</span><small>STAYS THAT STAY WITH YOU</small></span></a>
        <div className={`nav-links ${mobileNav ? 'nav-open' : ''}`}>
          <a href="#stays" onClick={() => setMobileNav(false)}>Explore stays</a><a href="#experience" onClick={() => setMobileNav(false)}>Our difference</a>
          {user && <button className="nav-link-button" onClick={() => { setModal('trips'); setMobileNav(false); }}>My trips</button>}
          {user?.role === 'admin' && <button className="nav-link-button" onClick={() => { setModal('admin'); setMobileNav(false); loadAdmin(); }}>Admin</button>}
        </div>
        <div className="nav-actions">
          {user ? <button className="profile-chip" onClick={() => setModal('trips')}><span className="avatar">{user.name?.[0]?.toUpperCase() || 'U'}</span><span>{user.name?.split(' ')[0] || 'Account'}</span></button> : <button className="sign-in" onClick={() => { setAuthMode('login'); setModal('auth'); }}>Sign in <ArrowUpRight size={15}/></button>}
          <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation">{mobileNav ? <X/> : <Menu/>}</button>
        </div>
      </nav>
    </header>

    <main>
      <section className="hero">
        <div className="hero-image"></div><div className="hero-overlay"></div>
        <div className="hero-content container">
          <div className="eyebrow light"><span></span> YOUR NEXT CHAPTER STARTS HERE</div>
          <h1>Somewhere<br/><em>you’ll love</em><br/>to come back to.</h1>
          <p>Beautiful stays, meaningful moments, and the little details that make a trip feel like yours.</p>
          <a href="#stays" className="hero-cta">Find your stay <span><ArrowRight size={17}/></span></a>
          <div className="hero-note"><div className="avatar-stack"><span>R</span><span>A</span><span>M</span></div><span>Loved by travellers who value the details</span><span className="hero-stars">★★★★★</span></div>
        </div>
        <div className="hero-caption"><span>01 / THE ART OF GETTING AWAY</span><span>DESIGNED FOR YOUR KIND OF REST</span></div>
      </section>

      <section className="search-section container" aria-label="Search rooms">
        <div className="search-panel">
          <div className="search-field destination-field"><label><MapPin size={15}/> DESTINATION / KEYWORD</label><div className="input-icon"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Try “garden” or “suite”"/></div></div>
          <div className="search-field"><label><CalendarDays size={15}/> CHECK IN</label><input type="date" min={today} value={checkIn} onChange={e => { setCheckIn(e.target.value); if (e.target.value >= checkOut) { const d = new Date(`${e.target.value}T00:00:00`); d.setDate(d.getDate()+1); setCheckOut(d.toLocaleDateString('en-CA')); } }}/></div>
          <div className="search-field"><label><CalendarDays size={15}/> CHECK OUT</label><input type="date" min={checkIn || today} value={checkOut} onChange={e => setCheckOut(e.target.value)}/></div>
          <div className="search-field guest-field"><label><Users size={15}/> GUESTS</label><select value={guests} onChange={e => setGuests(e.target.value)}><option value="1">1 guest</option><option value="2">2 guests</option><option value="3">3 guests</option><option value="4">4 guests</option></select></div>
          <button className="search-submit" onClick={() => { document.getElementById('stays')?.scrollIntoView({behavior:'smooth'}); loadRooms(); }}><Search size={17}/> Search stays</button>
        </div>
        <div className="search-foot"><span><ShieldCheck size={14}/> Thoughtfully selected rooms</span><span><Check size={14}/> No hidden booking fees</span><span><Clock3 size={14}/> Simple, secure reservations</span></div>
      </section>

      <section className="intro-section container" id="experience">
        <div className="eyebrow"><span></span> THE STAYORA STANDARD</div>
        <div className="intro-grid"><h2>Not just a place<br/>to sleep. <em>A place<br/>to feel good.</em></h2><div className="intro-copy"><p>We believe the best trips aren’t measured in miles, but in how they make you feel. Find a space that fits your pace, your people, and the moments you want to remember.</p><div className="intro-stat-row"><div><strong>Curated</strong><span>Comfort-first spaces</span></div><div><strong>Considered</strong><span>Details that matter</span></div><div><strong>Yours</strong><span>Stays made simple</span></div></div></div></div>
      </section>

      <section className="stays-section container" id="stays">
        <div className="section-heading"><div><div className="eyebrow"><span></span> FIND YOUR SPACE</div><h2>Stays worth <em>staying for.</em></h2><p>Find the room that feels right for your next little escape.</p></div><div className="result-meta"><span>{visibleRooms.length.toString().padStart(2,'0')} stays</span><span className="meta-line"></span><span>Handpicked for comfort</span></div></div>
        <div className="filters-row"><div className="type-tabs">{['All','Standard','Deluxe','Suite','Family'].map(t => <button key={t} className={type===t?'active':''} onClick={() => setType(t)}>{t}</button>)}</div><label className="sort-select"><SlidersHorizontal size={15}/><select value={sort} onChange={e => setSort(e.target.value)}><option value="recommended">Recommended</option><option value="rating">Top rated</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select><ChevronDown size={14}/></label></div>
        {visibleRooms.length ? <div className="room-grid">{visibleRooms.map((room, i) => <article className="room-card" key={room._id} style={{'--delay': `${i * 70}ms`}}><button className="room-image-button" onClick={() => openRoom(room)} aria-label={`View ${room.name}`}><img src={room.image} alt={room.name} loading="lazy"/><span className="room-type">{room.type}</span><span className="image-arrow"><ArrowUpRight size={18}/></span></button><div className="room-info"><div className="room-title-line"><h3>{room.name}</h3><span className="rating"><Star size={13} fill="currentColor"/>{room.rating?.toFixed(1)}</span></div><p className="room-desc">{room.description}</p><div className="room-specs"><span><BedDouble size={14}/>{room.beds}</span><span><Users size={14}/>{room.capacity} guests</span><span>{room.size} m²</span></div><div className="room-card-bottom"><div className="price"><strong>{money(room.pricePerNight)}</strong><span>/ night</span></div><button className="details-button" onClick={() => openRoom(room)}>View room <ArrowRight size={15}/></button></div></div></article>)}</div> : <div className="empty-state"><Compass size={30}/><h3>No stays found just yet</h3><p>Try a different room type, keyword, or guest count.</p><button className="outline-button" onClick={() => {setType('All');setSearch('');setGuests('2');}}>Clear filters</button></div>}
        <div className="listing-note"><span className="note-icon"><Sparkles size={17}/></span><span><strong>A good stay is in the details.</strong><br/>Every room is designed around comfort, calm, and the feeling of being right where you belong.</span><ArrowUpRight size={19}/></div>
      </section>

      <section className="experience-banner"><div className="experience-photo"></div><div className="experience-inner container"><div className="eyebrow light"><span></span> LITTLE THINGS, BIG DIFFERENCE</div><h2>Make room for<br/><em>the good stuff.</em></h2><p>Slow mornings. Soft sheets. One more hour with nowhere to be. Your stay should feel like part of the journey.</p><a href="#stays" className="text-link">Explore our rooms <ArrowRight size={16}/></a></div><div className="banner-index">STAY A LITTLE DIFFERENTLY — STAYORA</div></section>

      <section className="promise-section container"><div className="promise-heading"><div className="eyebrow"><span></span> THE PROMISE</div><h2>Travel lighter.<br/><em>Feel more.</em></h2></div><div className="promise-grid"><div><span className="promise-icon"><ShieldCheck/></span><h3>Booking with clarity</h3><p>Transparent nightly rates and a clear booking summary before you confirm.</p></div><div><span className="promise-icon"><Heart/></span><h3>Comfort comes first</h3><p>Spaces selected for the details that make it easier to settle in and unwind.</p></div><div><span className="promise-icon"><Coffee/></span><h3>Made for real life</h3><p>From quick getaways to family stays, find a room that fits your plans.</p></div></div></section>
    </main>

    <footer className="footer"><div className="container footer-main"><div><a href="#" className="brand footer-brand"><span className="brand-mark"><Hotel size={19}/></span><span>stayora<span className="brand-period">.</span><small>STAYS THAT STAY WITH YOU</small></span></a><p>Find a stay that feels like yours.<br/>Thoughtful spaces for meaningful moments.</p></div><div className="footer-links"><div><strong>Discover</strong><a href="#stays">Explore stays</a><a href="#experience">Our difference</a></div><div><strong>Your stay</strong><button onClick={() => user ? setModal('trips') : (setAuthMode('login'),setModal('auth'))}>My trips</button><button onClick={() => {setAuthMode('register');setModal('auth');}}>Create account</button></div></div></div><div className="container footer-bottom"><span>© 2026 Stayora. Made for the moments that matter.</span><span>DEMO HOTEL BOOKING EXPERIENCE</span></div></footer>

    {notice && <div className="toast" role="status"><span className="toast-check"><Check size={16}/></span><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={16}/></button></div>}

    {modal && <div className="modal-backdrop" onMouseDown={e => {if(e.target===e.currentTarget){setModal('');setSelected(null);}}}>
      {modal === 'auth' && <div className="modal auth-modal"><button className="modal-close" onClick={() => { setModal(''); setPendingRoom(null); }}><X/></button><div className="modal-brand"><span className="brand-mark"><Hotel size={20}/></span><span>stayora<span className="brand-period">.</span></span></div><div className="eyebrow"><span></span> YOUR NEXT STAY AWAITS</div><h2>{authMode==='login'?'Welcome back.':'Make yourself at home.'}</h2><p className="modal-sub">{authMode==='login'?'Sign in to manage your bookings and plan your next escape.':'Create an account and make your next getaway yours.'}</p><form onSubmit={submitAuth} className="auth-form">{authMode==='register' && <label>Full name<input required minLength="2" value={authForm.name} onChange={e=>setAuthForm({...authForm,name:e.target.value})} placeholder="Your name"/></label>}<label>Email address<input required type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="you@example.com"/></label><label>Password<input required minLength="8" type="password" value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} placeholder="At least 8 characters"/></label><button className="primary-button" disabled={busy}>{busy?'Please wait…':authMode==='login'?'Sign in securely':'Create account'} <ArrowRight size={16}/></button></form><div className="auth-switch">{authMode==='login'?"New to Stayora?":"Already have an account?"} <button onClick={()=>{setAuthMode(authMode==='login'?'register':'login');setNotice('');}}> {authMode==='login'?'Create an account':'Sign in'}</button></div><p className="privacy-note"><ShieldCheck size={14}/> Your password is securely hashed on our server.</p></div>}

      {modal === 'room' && selected && <div className="modal room-modal"><button className="modal-close floating-close" onClick={()=>{setModal('');setSelected(null);}}><X/></button><div className="room-modal-image"><img src={selected.image} alt={selected.name}/><span className="room-type">{selected.type}</span></div><div className="room-modal-body"><div className="room-modal-heading"><div><div className="eyebrow"><span></span> YOUR SPACE, YOUR PACE</div><h2>{selected.name}</h2></div><span className="rating big-rating"><Star size={15} fill="currentColor"/>{selected.rating?.toFixed(1)}</span></div><p>{selected.description}</p><div className="modal-spec-grid"><span><BedDouble/>{selected.beds}</span><span><Users/>{selected.capacity} guests max</span><span><Waves/>{selected.size} m²</span></div><div className="amenities">{(selected.amenities||[]).map(a=><span key={a}><Check size={13}/>{a}</span>)}</div><div className="booking-box"><div className="booking-box-dates"><div><label>CHECK IN</label><strong>{dateStr(checkIn)}</strong></div><div><label>CHECK OUT</label><strong>{dateStr(checkOut)}</strong></div><div><label>GUESTS</label><select value={bookingGuests} onChange={e=>setBookingGuests(e.target.value)}>{Array.from({length:selected.capacity},(_,i)=><option key={i} value={i+1}>{i+1} {i===0?'guest':'guests'}</option>)}</select></div></div><div className="booking-total"><div><strong>{money(selected.pricePerNight)}</strong><span> × {nights} {nights===1?'night':'nights'}</span></div><strong>{money(selected.pricePerNight*Math.max(nights,0))}</strong></div><button className="primary-button full-button" disabled={busy || nights<1} onClick={()=>bookRoom(selected)}>{busy?'Checking availability…':user?'Confirm booking':'Sign in to book'} <ArrowRight size={17}/></button><p className="booking-footnote"><ShieldCheck size={13}/> You’ll review the details before confirming.</p></div></div></div>}

      {modal === 'trips' && <div className="modal trips-modal"><button className="modal-close" onClick={()=>setModal('')}><X/></button><div className="eyebrow"><span></span> YOUR TRAVEL JOURNAL</div><h2>My trips<span className="brand-period">.</span></h2><p className="modal-sub">Every getaway starts with a little anticipation.</p>{bookings.length ? <div className="trips-list">{bookings.map(b=><article className="trip-card" key={b._id}><img src={b.room?.image || fallbackRooms[0].image} alt="Booked room"/><div className="trip-details"><span className={`status ${b.status}`}>{b.status}</span><h3>{b.room?.name || 'Hotel room'}</h3><p>{dateStr(String(b.checkIn).slice(0,10))} — {dateStr(String(b.checkOut).slice(0,10))}</p><strong>{money(b.totalPrice)}</strong>{b.status==='confirmed' && new Date(b.checkIn)>new Date() && <button className="cancel-link" onClick={()=>cancelBooking(b._id)}>Cancel booking</button>}</div></article>)}</div> : <div className="empty-trips"><span><Compass size={27}/></span><h3>Your next chapter is waiting.</h3><p>You haven’t booked a stay yet. Your future favourite room is just a little further down the page.</p><button className="primary-button" onClick={()=>{setModal('');document.getElementById('stays')?.scrollIntoView({behavior:'smooth'});}}>Explore stays <ArrowRight size={16}/></button></div>}<button className="logout-button" onClick={logout}><LogOut size={15}/> Sign out</button></div>}

      {modal === 'admin' && <div className="modal trips-modal admin-modal"><button className="modal-close" onClick={()=>setModal('')}><X/></button><div className="eyebrow"><span></span> STAYORA MANAGEMENT</div><h2>Admin overview<span className="brand-period">.</span></h2><div className="admin-stats"><div><span>Rooms</span><strong>{adminRooms.length}</strong></div><div><span>Total bookings</span><strong>{adminBookings.length}</strong></div><div><span>Confirmed</span><strong>{adminBookings.filter(b=>b.status==='confirmed').length}</strong></div></div>
        <h3 className="admin-heading">All bookings</h3>
        {adminBookings.length ? <div className="admin-list">{adminBookings.map(b=><div className="admin-row" key={b._id}><div><strong>{b.room?.name || 'Room removed'}</strong><span>{b.user?.name || 'Guest'} · {b.user?.email}</span><span>{dateStr(String(b.checkIn).slice(0,10))} — {dateStr(String(b.checkOut).slice(0,10))} · {money(b.totalPrice)}</span></div><div className="admin-row-actions"><span className={`status ${b.status}`}>{b.status}</span>{b.status==='confirmed' && new Date(b.checkIn)>new Date() && <button className="cancel-link" onClick={()=>adminCancel(b._id)}>Cancel</button>}</div></div>)}</div> : <p className="admin-hint">No bookings yet.</p>}
        <h3 className="admin-heading">Rooms</h3>
        <div className="admin-list">{adminRooms.map(r=><div className="admin-row" key={r._id}><div><strong>{r.name}</strong><span>{r.type} · {money(r.pricePerNight)} · up to {r.capacity} guests</span></div><div className="admin-row-actions"><span className={`status ${r.active ? '' : 'cancelled'}`}>{r.active ? 'visible' : 'hidden'}</span><button className="cancel-link" onClick={()=>toggleRoom(r)}>{r.active ? 'Hide' : 'Show'}</button></div></div>)}</div>
        <h3 className="admin-heading">Add a room</h3>
        <form className="auth-form admin-form" onSubmit={addRoom}><label>Room name<input required value={roomForm.name} onChange={e=>setRoomForm({...roomForm,name:e.target.value})}/></label><label>Type<select value={roomForm.type} onChange={e=>setRoomForm({...roomForm,type:e.target.value})}><option>Standard</option><option>Deluxe</option><option>Suite</option><option>Family</option></select></label><label>Price per night (₹)<input required type="number" min="1" inputMode="numeric" value={roomForm.pricePerNight} onChange={e=>setRoomForm({...roomForm,pricePerNight:e.target.value})}/></label><label>Max guests<input required type="number" min="1" max="12" inputMode="numeric" value={roomForm.capacity} onChange={e=>setRoomForm({...roomForm,capacity:e.target.value})}/></label><label>Image link (optional)<input type="url" value={roomForm.image} onChange={e=>setRoomForm({...roomForm,image:e.target.value})} placeholder="https://…"/></label><label>Amenities (comma separated)<input value={roomForm.amenities} onChange={e=>setRoomForm({...roomForm,amenities:e.target.value})} placeholder="Wi-Fi, Breakfast"/></label><label>Description<input required value={roomForm.description} onChange={e=>setRoomForm({...roomForm,description:e.target.value})}/></label><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Add room'} <ArrowRight size={16}/></button></form>
        <button className="logout-button" onClick={logout}><LogOut size={15}/> Sign out</button></div>}
    </div>}
  </div>;
}

export default App;
