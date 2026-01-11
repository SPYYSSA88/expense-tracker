
try {
    const keyword = '+';
    const regex = new RegExp(keyword, 'g');
    console.log("Regex created successfully");
} catch (error) {
    console.error("Crash confirmed:", error.message);
}
