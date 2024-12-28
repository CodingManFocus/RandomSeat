import React, { useState } from 'react';
import './App.css';
import XLSX from 'xlsx';
import Snowfall from './Snow'

function App() {

  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(6);
  const [seats, setSeats] = useState(
    Array.from({ length: 5 }, () => Array(6).fill(null))
  );
  const [assignedSeats, setAssignedSeats] = useState([]);
  const [highlightedSeat, setHighlightedSeat] = useState(null);

  const [names, setNames] = useState([]); // 리스트 상태

  const [isDisabled, setIsDisabled] = useState(false); // 버튼 상태 관리

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      const binaryStr = e.target.result;

      // XLSX 라이브러리를 사용하여 엑셀 파일 읽기
      const workbook = XLSX.read(binaryStr, { type: "binary" });
      const sheetName = workbook.SheetNames[0]; // 첫 번째 시트 선택
      const sheet = workbook.Sheets[sheetName];

      // A열 데이터 추출
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // 행 단위로 데이터를 가져옴
      const columnA = jsonData.map((row) => row[0]).filter((value) => value); // A열 값만 가져오기

      setNames(columnA);
    };

    reader.readAsBinaryString(file);
  };

  const handleSizeChange = () => {
    const newRows = parseInt(prompt('행의 수를 입력하세요:', rows));
    const newCols = parseInt(prompt('열의 수를 입력하세요:', cols));

    if (!isNaN(newRows) && !isNaN(newCols)) {
      setRows(newRows);
      setCols(newCols);
      setSeats(Array.from({ length: newRows }, () => Array(newCols).fill(null)));
      setAssignedSeats([]);
      setHighlightedSeat(null);
    }
  };

  const playDrum = () => {
    const audio = new Audio('/drum.wav');
    audio.play().catch((error) => console.error('오디오 파일을 재생하는데 실패했습니다:', error));
  };

  const handleSelectSeat = () => {
    setIsDisabled(true);
    playDrum();

    setTimeout(() => {
      const availableSeats = [];
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          if (!seats[i][j]) availableSeats.push({ row: i, col: j });
        }
      }

      if (availableSeats.length === 0) {
        alert('모든 자리가 이미 배정되었습니다.');
        return;
      }

      const randomSeat = availableSeats[Math.floor(Math.random() * availableSeats.length)];
      setHighlightedSeat(randomSeat);
      setAssignedSeats([...assignedSeats, `여기!`]);

      // "여기!" 표시 후 번호 입력 받기
      setTimeout(() => {
        let inputNumber;
        while (true) {
          const userInput = prompt('번호를 입력하세요 (취소를 누르면 무효화됩니다.):');
          if (userInput === null) {
            setHighlightedSeat(null);
            setIsDisabled(false);
            return; // 취소 시 함수 종료
          }
          inputNumber = parseInt(userInput);
          if (!isNaN(inputNumber) && inputNumber >= 1 && inputNumber <= names.length) break;
          alert('잘못된 번호입니다. 다시 입력하세요.');
        }

        const newSeats = [...seats];
        const name = names[inputNumber - 1];
        newSeats[randomSeat.row][randomSeat.col] = `${inputNumber}. ${name}`;

        setSeats(newSeats);
        setAssignedSeats([...assignedSeats, `${inputNumber}. ${name}`]);
        setHighlightedSeat(null);
        setIsDisabled(false);
      }, 150); // 즉시 번호를 입력받음
    }, 3000); // 3초 대기
  };

  const handleSelectAllSeats = () => {

    for (let userInput = 1; userInput < (names.length + 1); userInput++) {
      const availableSeats = [];
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          if (!seats[i][j]) availableSeats.push({ row: i, col: j });
        }
      }
      if (availableSeats.length === 0) {
        alert('자리수 보다 학생수가 더 많거나, 예측하지 못한 오류가 발생했습니다.');
        return;
      }
      const randomSeat = availableSeats[Math.floor(Math.random() * availableSeats.length)];
      setHighlightedSeat(randomSeat);
      setAssignedSeats([...assignedSeats, `여기!`]);


      let inputNumber = parseInt(userInput);
      const newSeats = [...seats];
      const name = names[inputNumber - 1];
      newSeats[randomSeat.row][randomSeat.col] = `${inputNumber}. ${name}`;

      setSeats(newSeats);
      setAssignedSeats([...assignedSeats, `${inputNumber}. ${name}`]);
      setHighlightedSeat(null);
      
    }
  };

  const gridStyle = {
    gridTemplateColumns: `repeat(${cols}, 1fr)`
  };

  const getGridItemStyle = (rowIndex, colIndex) => ({
    borderLeft: colIndex % 2 === 0 ? '3px solid black' : 'none',
    borderRight: colIndex % 2 !== 0 ? '3px solid black' : 'none',
    backgroundColor: highlightedSeat?.row === rowIndex && highlightedSeat?.col === colIndex ? 'yellow' : 'lightgray'
  });

  const renderSeat = (seat, rowIndex, colIndex) => (
    <div
      key={`${rowIndex}-${colIndex}`}
      className={`grid-item ${seat ? 'selected' : ''}`}
      style={getGridItemStyle(rowIndex, colIndex)}
    >
      {highlightedSeat?.row === rowIndex && highlightedSeat?.col === colIndex ? '여기!' : seat || ''}
    </div>
  );

  function exportToExcel() {
    const workbook = XLSX.utils.book_new();
    const sheetData = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        row.push(seats[i][j] || '');
      }
      sheetData.push(row);
    }
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Seats');
    XLSX.writeFile(workbook, 'seats.xlsx');
  }

  return (
    <>
      <div className="overlay"/>
      <div className="overlay2"/>
      <div className="App">
        <Snowfall/>
        <h1>자리 배치!</h1>
        <button onClick={handleSizeChange}>자리 크기 변경</button>
        <button onClick={handleSelectSeat} disabled={isDisabled}>자리 선출</button>
        <button onClick={handleSelectAllSeats}>전체 자리 배정</button>
        <button onClick={exportToExcel}>엑셀로 내보내기</button>
        <label className="upload-button">
        파일 선택
        <input
          type="file"
          accept=".xlsx"
          onChange={handleFileUpload}
          className="file-input"
        />
      </label>


        <div className="grid-container" style={gridStyle}>
          {seats.map((row, rowIndex) => (
            row.map((seat, colIndex) => renderSeat(seat, rowIndex, colIndex))
          ))}
        </div>
          <h2>-----------칠판-----------</h2>
          {/*<h2>배정된 학생:</h2>
          <ul>
            {assignedSeats.map((seat, index) => (
              <li key={index}>{seat}</li>
            ))}
          </ul>*/}
            <footer>
              <p>개발/배경 출처 : 홍태민(또는 포커스)</p>
              <a href="https://playentry.org"><p>효과음 출처 : 엔트리</p></a>
              <a href="https://codenamemc.kr"><p>© 2024 CodenameMC All rights reserved.</p></a>
            </footer>
      </div>
    </>
  );
}

export default App;
