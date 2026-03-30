import { useState } from 'react';
import './App.css';
import XLSX from 'xlsx';
import Snowfall from './Snow';

const createSeatGrid = (rowCount, colCount) => (
  Array.from({ length: rowCount }, () => Array(colCount).fill(null))
);

const getSeatKey = (rowIndex, colIndex) => `${rowIndex}-${colIndex}`;

const normalizeName = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
};

const getStudentLabel = (studentNumber, studentNames) => (
  `${studentNumber}. ${studentNames[studentNumber - 1]}`
);

const getAssignedNumbers = (seatGrid) => {
  const assignedNumbers = new Set();

  seatGrid.forEach((row) => {
    row.forEach((seat) => {
      if (!seat) {
        return;
      }

      const matchedNumber = String(seat).match(/^(\d+)\./);
      if (matchedNumber) {
        assignedNumbers.add(Number(matchedNumber[1]));
      }
    });
  });

  return assignedNumbers;
};

const getSelectableStudentNumbers = (studentNames, assignedNumbers) => (
  studentNames.reduce((result, name, index) => {
    const studentNumber = index + 1;

    if (name && !assignedNumbers.has(studentNumber)) {
      result.push(studentNumber);
    }

    return result;
  }, [])
);

const cloneSeatGrid = (seatGrid) => seatGrid.map((row) => [...row]);

const parseSeatCoordinate = (rawValue, rowCount, colCount) => {
  const matchedCoordinate = rawValue.trim().match(/^(\d+)\s*,\s*(\d+)$/);

  if (!matchedCoordinate) {
    return { error: '좌석은 "행,열" 형식으로 입력해주세요.' };
  }

  const row = Number(matchedCoordinate[1]);
  const col = Number(matchedCoordinate[2]);

  if (row < 1 || row > rowCount || col < 1 || col > colCount) {
    return { error: `좌석 ${rawValue} 는 현재 자리 크기를 벗어났습니다.` };
  }

  return {
    rowIndex: row - 1,
    colIndex: col - 1,
    key: getSeatKey(row - 1, col - 1),
  };
};

const parseSeatRules = ({ fixedSeatInput, forbiddenSeatInput, rowCount, colCount, studentNames }) => {
  const fixedSeats = {};
  const forbiddenSeats = {};
  const fixedStudentNumbers = new Set();

  const fixedLines = fixedSeatInput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of fixedLines) {
    const matchedRule = line.match(/^(\d+)\s*[=:]\s*(.+)$/);

    if (!matchedRule) {
      return { error: `고정 좌석 규칙 "${line}" 은 "번호=행,열" 형식이어야 합니다.` };
    }

    const studentNumber = Number(matchedRule[1]);
    const name = studentNames[studentNumber - 1];

    if (studentNumber < 1 || studentNumber > studentNames.length) {
      return { error: `번호 ${studentNumber} 는 불러온 학생 범위를 벗어났습니다.` };
    }

    if (!name) {
      return { error: `번호 ${studentNumber} 는 엑셀에서 비어 있으므로 고정 좌석으로 지정할 수 없습니다.` };
    }

    if (fixedStudentNumbers.has(studentNumber)) {
      return { error: `번호 ${studentNumber} 는 이미 다른 고정 좌석에 지정되어 있습니다.` };
    }

    const parsedCoordinate = parseSeatCoordinate(matchedRule[2], rowCount, colCount);
    if (parsedCoordinate.error) {
      return { error: `고정 좌석 규칙 "${line}": ${parsedCoordinate.error}` };
    }

    if (fixedSeats[parsedCoordinate.key]) {
      return { error: `좌석 ${matchedRule[2]} 는 이미 다른 고정 좌석에 사용 중입니다.` };
    }

    fixedStudentNumbers.add(studentNumber);
    fixedSeats[parsedCoordinate.key] = {
      row: parsedCoordinate.rowIndex,
      col: parsedCoordinate.colIndex,
      studentNumber,
    };
  }

  const forbiddenLines = forbiddenSeatInput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of forbiddenLines) {
    const parsedCoordinate = parseSeatCoordinate(line, rowCount, colCount);
    if (parsedCoordinate.error) {
      return { error: `금지 좌석 규칙 "${line}": ${parsedCoordinate.error}` };
    }

    if (fixedSeats[parsedCoordinate.key]) {
      return { error: `좌석 ${line} 는 이미 고정 좌석으로 지정되어 있어 금지 좌석으로 함께 둘 수 없습니다.` };
    }

    forbiddenSeats[parsedCoordinate.key] = {
      row: parsedCoordinate.rowIndex,
      col: parsedCoordinate.colIndex,
    };
  }

  return { fixedSeats, forbiddenSeats };
};

const buildSeatsWithRules = (rowCount, colCount, studentNames, fixedSeats) => {
  const nextSeats = createSeatGrid(rowCount, colCount);

  Object.values(fixedSeats).forEach(({ row, col, studentNumber }) => {
    nextSeats[row][col] = getStudentLabel(studentNumber, studentNames);
  });

  return nextSeats;
};

function App() {
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(6);
  const [seats, setSeats] = useState(createSeatGrid(5, 6));
  const [highlightedSeat, setHighlightedSeat] = useState(null);
  const [names, setNames] = useState([]);
  const [isDisabled, setIsDisabled] = useState(false);
  const [fixedSeatInput, setFixedSeatInput] = useState('');
  const [forbiddenSeatInput, setForbiddenSeatInput] = useState('');
  const [fixedSeats, setFixedSeats] = useState({});
  const [forbiddenSeats, setForbiddenSeats] = useState({});

  const rebuildSeats = (rowCount, colCount, studentNames, nextFixedSeats = fixedSeats) => {
    setSeats(buildSeatsWithRules(rowCount, colCount, studentNames, nextFixedSeats));
    setHighlightedSeat(null);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (loadEvent) => {
      const binaryStr = loadEvent.target.result;
      const workbook = XLSX.read(binaryStr, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const columnA = jsonData.map((row) => normalizeName(row[0]));

      setNames(columnA);
      rebuildSeats(rows, cols, columnA, fixedSeats);
    };

    reader.readAsBinaryString(file);
  };

  const handleSizeChange = () => {
    const newRows = Number.parseInt(prompt('행의 수를 입력하세요:', rows), 10);
    const newCols = Number.parseInt(prompt('열의 수를 입력하세요:', cols), 10);

    if (Number.isNaN(newRows) || Number.isNaN(newCols) || newRows < 1 || newCols < 1) {
      alert('행과 열은 1 이상의 숫자로 입력해주세요.');
      return;
    }

    setRows(newRows);
    setCols(newCols);
    setFixedSeats({});
    setForbiddenSeats({});
    rebuildSeats(newRows, newCols, names, {});
  };

  const playDrum = () => {
    const audio = new Audio('/drum.wav');
    audio.play().catch((error) => {
      console.error('오디오 파일을 재생하는데 실패했습니다:', error);
    });
  };

  const getAvailableSeatPositions = (seatGrid) => {
    const availableSeats = [];

    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      for (let colIndex = 0; colIndex < cols; colIndex += 1) {
        const seatKey = getSeatKey(rowIndex, colIndex);
        if (!seatGrid[rowIndex][colIndex] && !forbiddenSeats[seatKey]) {
          availableSeats.push({ row: rowIndex, col: colIndex });
        }
      }
    }

    return availableSeats;
  };

  const handleApplySeatRules = () => {
    const parsedRules = parseSeatRules({
      fixedSeatInput,
      forbiddenSeatInput,
      rowCount: rows,
      colCount: cols,
      studentNames: names,
    });

    if (parsedRules.error) {
      alert(parsedRules.error);
      return;
    }

    setFixedSeats(parsedRules.fixedSeats);
    setForbiddenSeats(parsedRules.forbiddenSeats);
    rebuildSeats(rows, cols, names, parsedRules.fixedSeats);
  };

  const handleSelectSeat = () => {
    const assignedNumbers = getAssignedNumbers(seats);
    const selectableStudentNumbers = getSelectableStudentNumbers(names, assignedNumbers);
    const availableSeats = getAvailableSeatPositions(seats);

    if (selectableStudentNumbers.length === 0) {
      alert('배정 가능한 학생이 없습니다. 엑셀의 빈 번호는 자동으로 건너뜁니다.');
      return;
    }

    if (availableSeats.length === 0) {
      alert('배정 가능한 자리가 없습니다. 금지 좌석과 고정 좌석 설정을 확인해주세요.');
      return;
    }

    setIsDisabled(true);
    playDrum();

    setTimeout(() => {
      const randomSeat = availableSeats[Math.floor(Math.random() * availableSeats.length)];
      setHighlightedSeat(randomSeat);

      setTimeout(() => {
        while (true) {
          const userInput = prompt('번호를 입력하세요. 비어 있는 번호는 자동으로 건너뜁니다. (취소 시 무효)');

          if (userInput === null) {
            setHighlightedSeat(null);
            setIsDisabled(false);
            return;
          }

          const inputNumber = Number.parseInt(userInput, 10);
          const name = names[inputNumber - 1];

          if (Number.isNaN(inputNumber) || inputNumber < 1 || inputNumber > names.length) {
            alert('잘못된 번호입니다. 다시 입력하세요.');
            continue;
          }

          if (!name) {
            alert('해당 번호는 엑셀에서 비어 있습니다. 다음 번호를 입력해주세요.');
            continue;
          }

          if (assignedNumbers.has(inputNumber)) {
            alert('이미 배정된 번호입니다. 다른 번호를 입력해주세요.');
            continue;
          }

          const nextSeats = cloneSeatGrid(seats);
          nextSeats[randomSeat.row][randomSeat.col] = getStudentLabel(inputNumber, names);

          setSeats(nextSeats);
          setHighlightedSeat(null);
          setIsDisabled(false);
          return;
        }
      }, 150);
    }, 3000);
  };

  const handleSelectAllSeats = () => {
    const nextSeats = cloneSeatGrid(seats);
    const assignedNumbers = getAssignedNumbers(nextSeats);
    const selectableStudentNumbers = getSelectableStudentNumbers(names, assignedNumbers);
    const availableSeats = getAvailableSeatPositions(nextSeats);

    if (selectableStudentNumbers.length === 0) {
      alert('배정 가능한 학생이 없습니다.');
      return;
    }

    if (selectableStudentNumbers.length > availableSeats.length) {
      alert('배정 가능한 자리보다 학생이 더 많습니다. 금지 좌석 또는 자리 크기를 확인해주세요.');
      return;
    }

    const shuffledSeats = [...availableSeats].sort(() => Math.random() - 0.5);

    selectableStudentNumbers.forEach((studentNumber, index) => {
      const seat = shuffledSeats[index];
      nextSeats[seat.row][seat.col] = getStudentLabel(studentNumber, names);
    });

    setSeats(nextSeats);
    setHighlightedSeat(null);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const sheetData = [];

    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      const row = [];

      for (let colIndex = 0; colIndex < cols; colIndex += 1) {
        const seatKey = getSeatKey(rowIndex, colIndex);
        if (forbiddenSeats[seatKey]) {
          row.push('금지 좌석');
        } else {
          row.push(seats[rowIndex][colIndex] || '');
        }
      }

      sheetData.push(row);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Seats');
    XLSX.writeFile(workbook, 'seats.xlsx');
  };

  const gridStyle = {
    gridTemplateColumns: `repeat(${cols}, minmax(96px, 1fr))`,
  };

  const getGridItemStyle = (rowIndex, colIndex) => {
    const seatKey = getSeatKey(rowIndex, colIndex);
    const isHighlighted = highlightedSeat?.row === rowIndex && highlightedSeat?.col === colIndex;
    const isFixedSeat = Boolean(fixedSeats[seatKey]);
    const isForbiddenSeat = Boolean(forbiddenSeats[seatKey]);

    let backgroundColor = 'lightgray';
    if (isFixedSeat || isForbiddenSeat) {
      backgroundColor = '#8ec5ff';
    }
    if (isHighlighted) {
      backgroundColor = 'yellow';
    }

    return {
      borderLeft: colIndex % 2 === 0 ? '3px solid black' : 'none',
      borderRight: colIndex % 2 !== 0 ? '3px solid black' : 'none',
      backgroundColor,
    };
  };

  const renderSeat = (seat, rowIndex, colIndex) => {
    const seatKey = getSeatKey(rowIndex, colIndex);
    const isForbiddenSeat = Boolean(forbiddenSeats[seatKey]);
    const isFixedSeat = Boolean(fixedSeats[seatKey]);

    let displayValue = seat || '';
    if (isForbiddenSeat) {
      displayValue = '금지 좌석';
    }
    if (highlightedSeat?.row === rowIndex && highlightedSeat?.col === colIndex) {
      displayValue = '여기!';
    }

    return (
      <div
        key={`${rowIndex}-${colIndex}`}
        className={`grid-item ${seat ? 'selected' : ''} ${isFixedSeat || isForbiddenSeat ? 'exception' : ''}`}
        style={getGridItemStyle(rowIndex, colIndex)}
      >
        {displayValue}
      </div>
    );
  };

  return (
    <>
      <div className="overlay" />
      <div className="overlay2" />
      <div className="App">
        <Snowfall />
        <h1>자리 배치!</h1>

        <div className="action-row">
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
        </div>

        <div className="grid-container" style={gridStyle}>
          {seats.map((row, rowIndex) => row.map((seat, colIndex) => renderSeat(seat, rowIndex, colIndex)))}
        </div>

        <h2>-----------칠판-----------</h2>

        <div className="rule-panel">
          <div className="rule-card">
            <h2>고정 좌석</h2>
            <p>한 줄에 하나씩 `번호=행,열` 형식으로 입력하세요. 예: `7=2,3`</p>
            <textarea
              value={fixedSeatInput}
              onChange={(event) => setFixedSeatInput(event.target.value)}
              placeholder={'3=1,1\n12=2,4'}
            />
          </div>

          <div className="rule-card">
            <h2>금지 좌석</h2>
            <p>한 줄에 하나씩 `행,열` 형식으로 입력하세요. 예: `5,6`</p>
            <textarea
              value={forbiddenSeatInput}
              onChange={(event) => setForbiddenSeatInput(event.target.value)}
              placeholder={'1,6\n5,5'}
            />
          </div>
        </div>
        <div className="rule-actions">
          <button onClick={handleApplySeatRules}>예외 좌석 적용</button>
          <span>고정 좌석과 금지 좌석은 파란색으로 표시됩니다.</span>
        </div>
        <footer>
          <p>개발/배경 출처 : 구산중 홍태민(포커스)</p>
          <a href="https://playentry.org"><p>효과음 출처 : 엔트리</p></a>
          <a href="https://codenamemc.kr"><p>© 2024 CodenameMC All rights reserved.</p></a>
        </footer>
      </div>
    </>
  );
}

export default App;
