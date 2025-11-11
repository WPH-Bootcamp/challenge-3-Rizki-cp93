// ============================================
// HABIT TRACKER CLI - CHALLENGE 3
// ============================================
// NAMA: [Isi nama Anda]
// KELAS: [Isi kelas Anda]
// TANGGAL: [Isi tanggal pengerjaan]
// ============================================

// TODO: Import module yang diperlukan
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// TODO: Definisikan konstanta
const DATA_FILE = path.join(__dirname, 'habits-data.json');
const REMINDER_INTERVAL = 10000; // 10 detik
const DAYS_IN_WEEK = 7;

// TODO: Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ============================================
// USER PROFILE OBJECT
// ============================================
const userProfile = {
  name: 'Nama Pengguna',
  joinDate: new Date().toISOString(), // default: sekarang
  totalHabits: 0,
  completedThisWeek: 0,

  // updateStats: menghitung total habits & completions this week
  updateStats(habits = []) {
    // gunakan nullish coalescing operator ?? minimal 1 tempat
    const list = habits ?? [];
    this.totalHabits = list.length;
    // completedThisWeek = jumlah habit yang isCompletedThisWeek() true
    this.completedThisWeek = list.filter(h => h.isCompletedThisWeek()).length;
  },

  // getDaysJoined: hitung berapa hari sejak joinDate
  getDaysJoined() {
    const joined = new Date(this.joinDate);
    const now = new Date();
    const diffMs = now - joined;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
};

// ============================================
// HABIT CLASS
// ============================================
class Habit {
  constructor(name = 'Unnamed Habit', targetFrequency = 1) {
    this.id = Habit.generateId();
    this.name = name ?? 'Unnamed Habit'; // nullish coalescing usage
    this.targetFrequency = Number(targetFrequency ?? 1);
    this.completions = []; // array of 'YYYY-MM-DD' strings
    this.createdAt = new Date().toISOString();
  }

  static generateId() {
    return 'h_' + Math.random().toString(36).slice(2, 9);
  }

  // push tanggal hari ini
  markComplete() {
    const today = Habit._formatDate(new Date());
    // hindari duplikat hari yang sama
    if (!this.completions.includes(today)) {
      this.completions.push(today);
      return true;
    }
    return false; // sudah tercatat hari ini
  }

  // helper untuk format date yyyy-mm-dd
  static _formatDate(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // get start of this week (Senin) - mengembalikan Date
  static _getWeekStart(date = new Date()) {
    // treat Monday as start: getDay() 1 -> Monday, 0 -> Sunday
    const d = new Date(date);
    const day = d.getDay(); // 0..6 (Sun..Sat)
    const diffToMonday = (day === 0) ? -6 : (1 - day);
    d.setDate(d.getDate() + diffToMonday);
    d.setHours(0,0,0,0);
    return d;
  }

  // filter completions yang ada di minggu ini
  getThisWeekCompletions() {
    const weekStart = Habit._getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + DAYS_IN_WEEK); // exclusive
    return this.completions.filter(dateStr => {
      const d = new Date(dateStr + 'T00:00:00');
      return d >= weekStart && d < weekEnd;
    });
  }

  // apakah sudah mencapai target minggu ini?
  isCompletedThisWeek() {
    const count = this.getThisWeekCompletions().length;
    return count >= this.targetFrequency;
  }

  // progress percentage minggu ini
  getProgressPercentage() {
    const done = this.getThisWeekCompletions().length;
    const pct = Math.min(100, Math.round((done / this.targetFrequency) * 100));
    return isNaN(pct) ? 0 : pct;
  }

  getStatus() {
    return this.isCompletedThisWeek() ? 'Selesai' : 'Aktif';
  }
}

// ============================================
// HABIT TRACKER CLASS
// ============================================
class HabitTracker {
  constructor(user = userProfile) {
    this.habits = [];
    this.user = user;
    this.reminderTimer = null;
    this.loadFromFile();
    this.user.updateStats(this.habits);
  }

  addHabit(name, frequency) {
    const h = new Habit(name, frequency ?? 1);
    this.habits.push(h);
    this.saveToFile();
    this.user.updateStats(this.habits);
    return h;
  }

  // habitIndex is 1-based for user; internal is 0-based
  completeHabit(habitIndex) {
    const idx = habitIndex - 1;
    const habit = this.habits[idx] ?? null; // nullish coalescing usage
    if (!habit) return { ok: false, message: 'Habit tidak ditemukan.' };
    const added = habit.markComplete();
    if (added) {
      this.saveToFile();
      this.user.updateStats(this.habits);
      return { ok: true, message: `Marked "${habit.name}" complete for today.` };
    } else {
      return { ok: false, message: `${habit.name} sudah ditandai hari ini.` };
    }
  }

  deleteHabit(habitIndex) {
    const idx = habitIndex - 1;
    const habit = this.habits[idx] ?? null;
    if (!habit) return { ok: false, message: 'Habit tidak ditemukan.' };
    this.habits.splice(idx, 1);
    this.saveToFile();
    this.user.updateStats(this.habits);
    return { ok: true, message: `Habit "${habit.name}" dihapus.` };
  }

  // Display methods
  displayProfile() {
    console.log('==================================================');
    console.log('PROFILE');
    console.log('==================================================');
    console.log(`Name: ${this.user.name}`);
    console.log(`Joined: ${new Date(this.user.joinDate).toLocaleString()}`);
    console.log(`Days joined: ${this.user.getDaysJoined()}`);
    console.log(`Total habits: ${this.user.totalHabits}`);
    console.log(`Completed this week: ${this.user.completedThisWeek}`);
    console.log('==================================================');
  }

  // filter: 'all' | 'active' | 'completed'
  displayHabits(filter = 'all') {
    let list = this.habits.slice();
    if (filter === 'active') {
      list = list.filter(h => !h.isCompletedThisWeek()); // filter usage
    } else if (filter === 'completed') {
      list = list.filter(h => h.isCompletedThisWeek()); // filter usage
    }
    if (list.length === 0) {
      console.log('[Tidak ada habit untuk ditampilkan]');
      return;
    }

    list.forEach((h, i) => {
      const idx = i + 1;
      const status = h.getStatus();
      const done = h.getThisWeekCompletions().length;
      const pct = h.getProgressPercentage();
      console.log(`${idx}. [${status}] ${h.name}`);
      console.log(`   Target: ${h.targetFrequency}x/minggu`);
      console.log(`   Progress: ${done}/${h.targetFrequency} (${pct}%)`);
      console.log(`   Progress Bar: ${this._renderProgressBar(pct)}`);
      console.log('');
    });
  }

  // progress bar ASCII
  _renderProgressBar(percentage) {
    const totalBlocks = 10;
    const filled = Math.round((percentage / 100) * totalBlocks);
    const empty = totalBlocks - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percentage}%`;
  }

  // display using while loop (demonstrasi)
  displayHabitsWithWhile() {
    console.log('--- displayHabitsWithWhile ---');
    let i = 0;
    while (i < this.habits.length) {
      console.log(`${i+1}. ${this.habits[i].name} [${this.habits[i].getStatus()}]`);
      i++;
    }
  }

  // display using for loop (demonstrasi)
  displayHabitsWithFor() {
    console.log('--- displayHabitsWithFor ---');
    for (let i = 0; i < this.habits.length; i++) {
      console.log(`${i+1}. ${this.habits[i].name} -> ${this.habits[i].getProgressPercentage()}%`);
    }
  }

  // statistics summary: gunakan map, filter, find, forEach dsb.
  displayStats() {
    console.log('--- STATISTICS ---');
    console.log(`Total habits: ${this.habits.length}`);
    const names = this.habits.map(h => h.name); // map usage
    console.log('Habit names:', names.join(', ') || '-');
    const completed = this.habits.filter(h => h.isCompletedThisWeek()); // filter usage
    console.log(`Completed this week: ${completed.length}`);
    const notCompleted = this.habits.filter(h => !h.isCompletedThisWeek());
    console.log(`Active (not completed): ${notCompleted.length}`);

    // find habit with highest completion percent
    if (this.habits.length > 0) {
      let best = this.habits[0];
      this.habits.forEach(h => { // forEach usage
        if (h.getProgressPercentage() > best.getProgressPercentage()) best = h;
      });
      console.log(`Habit paling maju: ${best.name} (${best.getProgressPercentage()}%)`);
    }
    console.log('-------------------');
  }

  // Reminder system: every REMINDER_INTERVAL ms, show reminder for first active habit
  startReminder() {
    if (this.reminderTimer) return;
    this.reminderTimer = setInterval(() => this.showReminder(), REMINDER_INTERVAL);
  }

  showReminder() {
    // show reminder only if ada habit aktif (belum selesai minggu ini)
    const active = this.habits.find(h => !h.isCompletedThisWeek()); // find usage
    if (active) {
      console.log('==================================================');
      console.log(`REMINDER: Jangan lupa "${active.name}"!`);
      console.log('==================================================');
    }
  }

  stopReminder() {
    if (this.reminderTimer) {
      clearInterval(this.reminderTimer);
      this.reminderTimer = null;
    }
  }

  // File operations: save & load
  saveToFile() {
    try {
      // Serialize minimal data
      const data = {
        user: {
          name: this.user.name ?? 'Nama Pengguna', // nullish coalescing usage
          joinDate: this.user.joinDate ?? new Date().toISOString()
        },
        habits: this.habits.map(h => ({
          id: h.id,
          name: h.name,
          targetFrequency: h.targetFrequency,
          completions: h.completions,
          createdAt: h.createdAt
        }))
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Gagal menyimpan data:', err.message);
    }
  }

  loadFromFile() {
    try {
      if (!fs.existsSync(DATA_FILE)) return;
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      // restore user
      if (parsed.user) {
        this.user.name = parsed.user.name ?? this.user.name;
        this.user.joinDate = parsed.user.joinDate ?? this.user.joinDate;
      }
      // restore habits
      this.habits = (parsed.habits ?? []).map(h => {
        const habit = new Habit(h.name ?? 'Unnamed', h.targetFrequency ?? 1);
        habit.id = h.id ?? habit.id;
        habit.completions = Array.isArray(h.completions) ? h.completions : [];
        habit.createdAt = h.createdAt ?? habit.createdAt;
        return habit;
      });
    } catch (err) {
      console.error('Gagal memuat data:', err.message);
    }
  }

  clearAllData() {
    this.habits = [];
    this.user = { ...this.user, joinDate: this.user.joinDate }; // keep join date
    try {
      if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
    } catch (err) {
      console.error('Gagal menghapus file data:', err.message);
    }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

function displayMenu() {
  console.log('');
  console.log('==================================================');
  console.log('HABIT TRACKER - MAIN MENU');
  console.log('==================================================');
  console.log('1. Lihat Profil');
  console.log('2. Lihat Semua Kebiasaan');
  console.log('3. Lihat Kebiasaan Aktif');
  console.log('4. Lihat Kebiasaan Selesai');
  console.log('5. Tambah Kebiasaan Baru');
  console.log('6. Tandai Kebiasaan Selesai');
  console.log('7. Hapus Kebiasaan');
  console.log('8. Lihat Statistik');
  console.log('9. Demo Loop (while/for)');
  console.log('0. Keluar');
  console.log('==================================================');
}

// handleMenu: async loop to process menu
async function handleMenu(tracker) {
  tracker.startReminder(); // start reminder background
  let exit = false;
  while (!exit) {
    displayMenu();
    const choice = (await askQuestion('Pilih menu (0-9): ')).trim();
    console.log('');
    switch (choice) {
      case '1':
        tracker.displayProfile();
        break;
      case '2':
        tracker.displayHabits('all');
        break;
      case '3':
        tracker.displayHabits('active');
        break;
      case '4':
        tracker.displayHabits('completed');
        break;
      case '5': {
        const name = (await askQuestion('Nama kebiasaan: ')).trim();
        const freqInput = (await askQuestion('Target per minggu (angka): ')).trim();
        const freq = parseInt(freqInput) || 1;
        const h = tracker.addHabit(name || 'Unnamed Habit', freq);
        console.log(`Berhasil menambahkan: ${h.name} (${h.targetFrequency}/minggu)`);
        break;
      }
      case '6': {
        if (tracker.habits.length === 0) {
          console.log('Belum ada habit.');
          break;
        }
        tracker.displayHabits('all');
        const idxInput = await askQuestion('Masukkan nomor habit yg ingin ditandai selesai hari ini: ');
        const idx = parseInt(idxInput);
        if (isNaN(idx)) {
          console.log('Input tidak valid.');
        } else {
          const res = tracker.completeHabit(idx);
          console.log(res.message);
        }
        break;
      }
      case '7': {
        if (tracker.habits.length === 0) {
          console.log('Belum ada habit.');
          break;
        }
        tracker.displayHabits('all');
        const idxInput = await askQuestion('Masukkan nomor habit yg ingin dihapus: ');
        const idx = parseInt(idxInput);
        if (isNaN(idx)) {
          console.log('Input tidak valid.');
        } else {
          const res = tracker.deleteHabit(idx);
          console.log(res.message);
        }
        break;
      }
      case '8':
        tracker.displayStats();
        break;
      case '9':
        // Demo loop: while and for
        console.log('Demo: while loop menampilkan list habit names');
        tracker.displayHabitsWithWhile();
        console.log('Demo: for loop menampilkan progress %');
        tracker.displayHabitsWithFor();
        break;
      case '0':
        exit = true;
        console.log('Keluar... Menyimpan data dan menghentikan reminder.');
        tracker.saveToFile();
        tracker.stopReminder();
        break;
      default:
        console.log('Pilihan tidak dikenal, coba lagi.');
    }

    // jeda kecil supaya output rapi
    if (!exit) await new Promise(r => setTimeout(r, 200));
  }
}

// ============================================
// MAIN FUNCTION
// ============================================
async function main() {
  console.log('// ============================================');
  console.log('// HABIT TRACKER CLI - CHALLENGE 3');
  console.log('// ============================================');
  // Atur user name (opsional)
  const nameInput = (await askQuestion('Masukkan nama Anda (Enter kalau mau default): ')).trim();
  userProfile.name = nameInput || userProfile.name;

  // create tracker
  const tracker = new HabitTracker(userProfile);

  // Optional: Tambah data demo jika kosong, supaya ada sesuatu untuk diingat
  if (tracker.habits.length === 0) {
    tracker.addHabit('Minum Air 8 Gelas', 7);
    tracker.addHabit('Baca Buku 30 Menit', 5);
    tracker.addHabit('Olahraga Ringan', 3);
    console.log('[Data demo ditambahkan karena file data kosong]');
  }

  // Update stats and start menu handler
  tracker.user.updateStats(tracker.habits);
  try {
    await handleMenu(tracker);
  } catch (err) {
    console.error('Terjadi error:', err.message);
  } finally {
    rl.close();
  }
}

// TODO: Jalankan main() dengan error handling
main().catch(err => {
  console.error('Fatal error:', err);
  rl.close();
});
