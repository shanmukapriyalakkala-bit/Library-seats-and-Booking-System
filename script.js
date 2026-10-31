const TOTAL_SEATS = 20;
const STORAGE_KEY = "libraryBookings";

const seatMap = document.getElementById("seatMap");
const bookingForm = document.getElementById("bookingForm");
const selectedSeatInput = document.getElementById("selectedSeat");
const bookingDateInput = document.getElementById("bookingDate");
const timeSlotInput = document.getElementById("timeSlot");
const message = document.getElementById("message");
const historyBox = document.getElementById("bookingHistory");

let selectedSeat = "";
let bookings = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

// Set today's date as the earliest selectable date.
const today = new Date();
const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
].join("-");

bookingDateInput.min = localToday;
bookingDateInput.value = localToday;

// Save bookings in this browser.
function saveBookings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

// Find the end time of a booking.
function getEndTime(booking) {
    const endTime = booking.slot.split(" - ")[1];
    return new Date(`${booking.date}T${endTime}:00`).getTime();
}

// Release bookings whose time has expired.
function releaseExpiredBookings() {
    const now = Date.now();

    bookings.forEach(booking => {
        if (booking.status === "Active" && getEndTime(booking) <= now) {
            booking.status = "Expired";
        }
    });

    saveBookings();
}

// Check whether a seat is already booked for this slot.
function isSeatOccupied(seatNumber) {
    return bookings.some(booking =>
        booking.seat === seatNumber &&
        booking.date === bookingDateInput.value &&
        booking.slot === timeSlotInput.value &&
        booking.status === "Active" &&
        getEndTime(booking) > Date.now()
    );
}

// Create the visual seat map.
function renderSeats() {
    seatMap.innerHTML = "";
    let available = 0;
    let occupied = 0;

    for (let i = 1; i <= TOTAL_SEATS; i++) {
        const seatNumber = `S${String(i).padStart(2, "0")}`;
        const isOccupied = isSeatOccupied(seatNumber);
        const button = document.createElement("button");

        button.type = "button";
        button.className = "seat";
        button.textContent = isOccupied
            ? `${seatNumber} ✖`
            : `${seatNumber} ✓`;

        if (isOccupied) {
            button.classList.add("occupied");
            button.disabled = true;
            occupied++;
        } else {
            available++;
            button.classList.add(
                selectedSeat === seatNumber ? "selected" : "available"
            );

            button.addEventListener("click", () => {
                selectedSeat = seatNumber;
                selectedSeatInput.value = seatNumber;
                message.textContent = "";
                renderSeats();
            });
        }

        seatMap.appendChild(button);
    }

    document.getElementById("totalSeats").textContent = TOTAL_SEATS;
    document.getElementById("availableSeats").textContent = available;
    document.getElementById("occupiedSeats").textContent = occupied;
}

// Handle the booking form.
bookingForm.addEventListener("submit", function(event) {
    event.preventDefault();

    releaseExpiredBookings();

    const name = document.getElementById("studentName").value.trim();
    const studentId = document.getElementById("studentId").value.trim();
    const date = bookingDateInput.value;
    const slot = timeSlotInput.value;

    if (!selectedSeat) {
        message.textContent = "Please select a seat from the seat map.";
        return;
    }

    if (!name || !studentId || !date || !slot) {
        message.textContent = "Please complete all the fields.";
        return;
    }

    if (isSeatOccupied(selectedSeat)) {
        message.textContent = "This seat is already booked for this slot.";
        selectedSeat = "";
        selectedSeatInput.value = "";
        renderSeats();
        return;
    }

    if (getEndTime({ date, slot }) <= Date.now()) {
        message.textContent = "This time slot has already ended.";
        return;
    }

    const booking = {
        id: Date.now(),
        name,
        studentId,
        seat: selectedSeat,
        date,
        slot,
        status: "Active"
    };

    bookings.push(booking);
    saveBookings();

    message.textContent =
        `Booking confirmed! Your seat is ${selectedSeat}.`;

    selectedSeat = "";
    selectedSeatInput.value = "";
    bookingForm.reset();
    bookingDateInput.value = localToday;

    renderSeats();
    renderHistory();
});

// Display booking history.
function renderHistory() {
    historyBox.innerHTML = "";

    if (bookings.length === 0) {
        historyBox.innerHTML =
            '<p class="empty">No bookings yet. Book your first seat!</p>';
        return;
    }

    [...bookings].reverse().forEach(booking => {
        const item = document.createElement("div");
        item.className = "booking-item";

        const details = document.createElement("p");
        details.textContent =
            `${booking.name} (${booking.studentId}) — ${booking.seat}`;

        const timing = document.createElement("p");
        timing.textContent = `${booking.date} | ${booking.slot}`;

        const status = document.createElement("p");
        status.textContent = `Status: ${booking.status}`;

        item.append(details, timing, status);

        if (booking.status === "Active") {
            const cancelButton = document.createElement("button");
            cancelButton.type = "button";
            cancelButton.className = "release-button";
            cancelButton.textContent = "Cancel Booking";

            cancelButton.addEventListener("click", () => {
                booking.status = "Cancelled";
                saveBookings();
                renderSeats();
                renderHistory();
            });

            item.appendChild(cancelButton);
        }

        historyBox.appendChild(item);
    });
}

// Refresh the seat map when the date or time slot changes.
bookingDateInput.addEventListener("change", () => {
    selectedSeat = "";
    selectedSeatInput.value = "";
    renderSeats();
});

timeSlotInput.addEventListener("change", () => {
    selectedSeat = "";
    selectedSeatInput.value = "";
    renderSeats();
});

// Check expired bookings periodically.
function refreshWebsite() {
    releaseExpiredBookings();
    renderSeats();
    renderHistory();
}

refreshWebsite();
setInterval(refreshWebsite, 15000);